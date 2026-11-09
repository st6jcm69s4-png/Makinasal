-- Açık artırma kuralları (kullanıcı kararı, 9 Kasım):
--  * Yalnızca Pro / Firma Pro üyeler teklif verebilir.
--  * Bitime 1 saatten fazla varken teklif geri çekilebilir veya düşürülebilir (en fazla 2 kez); diğer adaylara ve satıcıya bildirim gider.
--  * Kazanan ödeme yapmazsa (satıcı bildirir, yönetici onaylar) ya da kendisi vazgeçerse: premium üyeliği iadesiz iptal,
--    hesabı kalıcı, kullandığı IP adresleri 30 gün açık artırmalardan men edilir; sıradaki teklif verene 48 saatlik teklif gider.
-- Video: telefondan video yükleme yalnızca premium üyelere; satılan/kaldırılan ilanların videoları 30 gün sonra silinir.

-- Yardımcılar -------------------------------------------------------------------------------------------
create or replace function makinasal_private.is_premium(p uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_premium and (premium_until is null or premium_until > now()) from public.profiles where id = p), false)
$$;

create or replace function public.my_premium_active()
returns boolean language sql stable security definer set search_path = ''
as $$ select makinasal_private.is_premium((select auth.uid())) $$;
revoke all on function public.my_premium_active() from public, anon;
grant execute on function public.my_premium_active() to authenticated;

-- İstek IP'sinin tuzlu özeti (IP'nin kendisi saklanmaz)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'ip_salt') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ip_salt', 'Açık artırma IP özeti için tuz');
  end if;
end $$;

create or replace function makinasal_private.request_ip_hash()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare h json; ip text; salt text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  ip := nullif(btrim(coalesce(h->>'cf-connecting-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1), h->>'x-real-ip')), '');
  if ip is null then return null; end if;
  select decrypted_secret into salt from vault.decrypted_secrets where name = 'ip_salt';
  return encode(extensions.digest(ip || coalesce(salt, ''), 'sha256'), 'hex');
end $$;

create or replace function makinasal_private.human_left(t timestamptz)
returns text language sql stable set search_path = ''
as $$
  select case
    when t <= now() then 'süre doldu'
    when t - now() >= interval '1 day' then extract(day from t - now())::int || ' gün ' || extract(hour from t - now())::int || ' saat'
    when t - now() >= interval '1 hour' then extract(hour from t - now())::int || ' saat ' || extract(minute from t - now())::int || ' dakika'
    else greatest(1, extract(minute from t - now())::int) || ' dakika' end
$$;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['message', 'price_drop', 'quote', 'quote_message', 'saved_search',
                           'bid', 'outbid', 'auction_won', 'auction_ended',
                           'bid_withdrawn', 'second_chance', 'unpaid']));

-- Tablolar ----------------------------------------------------------------------------------------------
alter table public.auction_bids add column if not exists withdrawn_at timestamptz;
alter table public.auction_bids add column if not exists ip_hash text;
alter table public.auctions add column if not exists winner_at timestamptz;

create table if not exists public.auction_withdrawals (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references auth.users(id) on delete cascade,
  old_amount numeric(14,2) not null,
  new_amount numeric(14,2),
  created_at timestamptz not null default now()
);
create index if not exists auction_withdrawals_idx on public.auction_withdrawals(auction_id, bidder_id);
create index if not exists auction_withdrawals_bidder_idx on public.auction_withdrawals(bidder_id);

create table if not exists public.auction_unpaid (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('seller_report', 'buyer_backout')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (auction_id, buyer_id)
);
create index if not exists auction_unpaid_buyer_idx on public.auction_unpaid(buyer_id);

create table if not exists public.auction_offers (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (auction_id, bidder_id)
);
create index if not exists auction_offers_pending_idx on public.auction_offers(expires_at) where status = 'pending';
create index if not exists auction_offers_bidder_idx on public.auction_offers(bidder_id);

create table if not exists public.auction_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_hash text,
  until timestamptz,             -- null = kalıcı
  reason text not null,
  auction_id uuid references public.auctions(id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_id is not null or ip_hash is not null)
);
create index if not exists auction_bans_user_idx on public.auction_bans(user_id);
create index if not exists auction_bans_ip_idx on public.auction_bans(ip_hash);
create index if not exists auction_bans_auction_idx on public.auction_bans(auction_id);

alter table public.auction_withdrawals enable row level security;
alter table public.auction_unpaid enable row level security;
alter table public.auction_offers enable row level security;
alter table public.auction_bans enable row level security;
revoke all on public.auction_withdrawals, public.auction_unpaid, public.auction_offers, public.auction_bans from anon, authenticated;

create or replace function makinasal_private.auction_banned(p_user uuid, p_ip text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.auction_bans b
    where (b.until is null or b.until > now())
      and ((p_user is not null and b.user_id = p_user) or (p_ip is not null and b.ip_hash = p_ip))
  )
$$;

-- Teklif sırası: (geri çekilmemiş) en yüksek teklif → lider. Teklif sayısı = geçerli teklifler.
create or replace function makinasal_private.recompute_auction(p_auction uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare top record;
begin
  select amount, bidder_id into top from public.auction_bids
   where auction_id = p_auction and withdrawn_at is null order by amount desc, created_at asc limit 1;
  update public.auctions
     set current_price = top.amount, leader_id = top.bidder_id,
         bid_count = (select count(*) from public.auction_bids where auction_id = p_auction and withdrawn_at is null)
   where id = p_auction;
end $$;

create or replace function makinasal_private.bidder_no(p_auction uuid, p_user uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  with firsts as (select bidder_id, min(created_at) f from public.auction_bids where auction_id = p_auction group by bidder_id)
  select n from (select bidder_id, row_number() over (order by f)::int n from firsts) x where bidder_id = p_user
$$;

-- Teklif ver (premium + men kontrolü eklendi) -------------------------------------------------------------
create or replace function public.place_bid(p_auction uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); a record; v_min numeric; v_title text; v_prev uuid; v_end timestamptz; v_ip text := makinasal_private.request_ip_hash();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not makinasal_private.is_premium(v_uid) then raise exception 'PREMIUM_REQUIRED'; end if;
  if makinasal_private.auction_banned(v_uid, v_ip) then raise exception 'AUCTION_BANNED'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if a is null then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.seller_id = v_uid then raise exception 'OWN_AUCTION'; end if;
  if a.leader_id = v_uid then raise exception 'ALREADY_LEADING'; end if;
  if makinasal_moderation.is_blocked(v_uid, a.seller_id) then raise exception 'MESSAGE_BLOCKED'; end if;
  if not exists (select 1 from public.listings where id = a.listing_id and status = 'active' and moderation_status = 'approved') then
    raise exception 'LISTING_NOT_LIVE';
  end if;
  if (select count(*) from public.auction_bids where bidder_id = v_uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'RATE_LIMIT';
  end if;
  v_min := case when a.current_price is null then a.start_price else a.current_price + a.min_increment end;
  if p_amount is null or p_amount < v_min then raise exception 'BID_TOO_LOW:%', v_min; end if;
  if p_amount > 999999999999 then raise exception 'INVALID_PRICE'; end if;

  insert into public.auction_bids(auction_id, bidder_id, amount, ip_hash) values (p_auction, v_uid, round(p_amount, 2), v_ip);
  v_prev := a.leader_id;
  v_end := case when a.ends_at - now() < interval '5 minutes' then now() + interval '5 minutes' else a.ends_at end;
  update public.auctions set ends_at = v_end where id = p_auction;
  perform makinasal_private.recompute_auction(p_auction);

  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  insert into public.notifications(user_id, kind, title, body, url)
  values (a.seller_id, 'bid', 'Açık artırmana yeni teklif: ' || makinasal_private.money(round(p_amount, 2)), coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  if v_prev is not null and v_prev <> v_uid then
    insert into public.notifications(user_id, kind, title, body, url)
    values (v_prev, 'outbid', 'Teklifin geçildi: ' || makinasal_private.money(round(p_amount, 2)), coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  end if;
  return (select jsonb_build_object('current_price', current_price, 'ends_at', ends_at, 'bid_count', bid_count) from public.auctions where id = p_auction);
end $$;

-- Teklifi geri çek / düşür -------------------------------------------------------------------------------
create or replace function public.withdraw_bid(p_auction uuid, p_new_amount numeric default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); a record; v_my numeric; v_title text; v_no int; v_title_msg text; r record; v_now record;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if a is null then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.ends_at - now() <= interval '1 hour' then raise exception 'WITHDRAW_CLOSED'; end if;
  select max(amount) into v_my from public.auction_bids where auction_id = p_auction and bidder_id = v_uid and withdrawn_at is null;
  if v_my is null then raise exception 'NO_BID'; end if;
  if (select count(*) from public.auction_withdrawals where auction_id = p_auction and bidder_id = v_uid) >= 2 then
    raise exception 'WITHDRAW_LIMIT';
  end if;
  if p_new_amount is not null then
    p_new_amount := round(p_new_amount, 2);
    if p_new_amount >= v_my then raise exception 'NEW_AMOUNT_NOT_LOWER'; end if;
    if p_new_amount < a.start_price then raise exception 'BELOW_START:%', a.start_price; end if;
    if exists (select 1 from public.auction_bids where auction_id = p_auction and withdrawn_at is null and bidder_id <> v_uid and amount = p_new_amount) then
      raise exception 'AMOUNT_TAKEN';
    end if;
  end if;

  update public.auction_bids set withdrawn_at = now() where auction_id = p_auction and bidder_id = v_uid and withdrawn_at is null;
  if p_new_amount is not null then
    insert into public.auction_bids(auction_id, bidder_id, amount, ip_hash) values (p_auction, v_uid, p_new_amount, makinasal_private.request_ip_hash());
  end if;
  insert into public.auction_withdrawals(auction_id, bidder_id, old_amount, new_amount) values (p_auction, v_uid, v_my, p_new_amount);
  perform makinasal_private.recompute_auction(p_auction);

  select current_price, ends_at, bid_count into v_now from public.auctions where id = p_auction;
  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  v_no := makinasal_private.bidder_no(p_auction, v_uid);
  v_title_msg := 'Teklif veren ' || v_no || ' ' || makinasal_private.money(v_my) || ' teklifini ' ||
                 case when p_new_amount is null then 'geri çekti' else makinasal_private.money(p_new_amount) || ' olarak düşürdü' end;
  for r in
    select distinct bidder_id as uid from public.auction_bids where auction_id = p_auction and bidder_id <> v_uid
    union select a.seller_id
  loop
    insert into public.notifications(user_id, kind, title, body, url)
    values (r.uid, 'bid_withdrawn', v_title_msg,
            coalesce(v_title, '') || ' · Güncel teklif: ' || coalesce(makinasal_private.money(v_now.current_price), 'yok') ||
            ' · Bitime ' || makinasal_private.human_left(v_now.ends_at) || ' kaldı',
            '/ilanlar/' || a.listing_id::text);
  end loop;
  return jsonb_build_object('current_price', v_now.current_price, 'ends_at', v_now.ends_at, 'bid_count', v_now.bid_count);
end $$;

-- Geçmiş ve durum: geri çekilen teklifler gösterilmez ----------------------------------------------------
create or replace function public.auction_bid_history(p_auction uuid)
returns table(amount numeric, created_at timestamptz, bidder_no integer, mine boolean)
language sql stable security definer set search_path = ''
as $$
  with firsts as (
    select bidder_id, min(created_at) as first_at from public.auction_bids where auction_id = p_auction group by bidder_id
  ), nums as (
    select bidder_id, row_number() over (order by first_at)::int as n from firsts
  )
  select b.amount, b.created_at, n.n, b.bidder_id = (select auth.uid())
  from public.auction_bids b join nums n on n.bidder_id = b.bidder_id
  where b.auction_id = p_auction and b.withdrawn_at is null
  order by b.amount desc
  limit 30
$$;

create or replace function public.my_auction_status(p_auction uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when exists (select 1 from public.auction_unpaid u where u.auction_id = a.id and u.buyer_id = (select auth.uid()) and u.status = 'confirmed') then 'unpaid'
    when a.winner_id = (select auth.uid()) then 'won'
    when exists (select 1 from public.auction_offers o where o.auction_id = a.id and o.bidder_id = (select auth.uid()) and o.status = 'pending' and o.expires_at > now()) then 'offer'
    when a.status = 'active' and a.leader_id = (select auth.uid()) then 'leading'
    when a.status = 'active' and exists (select 1 from public.auction_bids b where b.auction_id = a.id and b.bidder_id = (select auth.uid()) and b.withdrawn_at is null) then 'outbid'
    else null end
  from public.auctions a where a.id = p_auction
$$;

-- Ayrıntılar: kendi geçerli teklifim, geri çekme hakkım, bekleyen teklifim, satıcı için durum
create or replace function public.my_auction_details(p_auction uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'my_bid', (select max(amount) from public.auction_bids where auction_id = a.id and bidder_id = (select auth.uid()) and withdrawn_at is null),
    'withdrawals_left', greatest(0, 2 - (select count(*) from public.auction_withdrawals where auction_id = a.id and bidder_id = (select auth.uid())))::int,
    'offer', (select jsonb_build_object('amount', amount, 'expires_at', expires_at) from public.auction_offers
               where auction_id = a.id and bidder_id = (select auth.uid()) and status = 'pending' and expires_at > now()),
    'premium', makinasal_private.is_premium((select auth.uid())),
    'banned', makinasal_private.auction_banned((select auth.uid()), makinasal_private.request_ip_hash()),
    'seller', case when a.seller_id = (select auth.uid()) then jsonb_build_object(
        'has_winner', a.winner_id is not null,
        'winner_at', a.winner_at,
        'can_report', a.status = 'ended' and a.winner_id is not null and a.winner_at > now() - interval '7 days'
                      and not exists (select 1 from public.auction_unpaid u where u.auction_id = a.id and u.buyer_id = a.winner_id),
        'unpaid_status', (select u.status from public.auction_unpaid u where u.auction_id = a.id order by u.created_at desc limit 1),
        'offer_pending', exists (select 1 from public.auction_offers o where o.auction_id = a.id and o.status = 'pending' and o.expires_at > now())
      ) end
  )
  from public.auctions a where a.id = p_auction and (select auth.uid()) is not null
$$;

-- Sıradaki teklif verene 48 saatlik teklif ----------------------------------------------------------------
create or replace function makinasal_private.offer_next(p_auction uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare a record; c record; v_title text;
begin
  select * into a from public.auctions where id = p_auction;
  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  select b.bidder_id, max(b.amount) as amount into c
    from public.auction_bids b
   where b.auction_id = p_auction and b.withdrawn_at is null and b.bidder_id <> a.seller_id
     and b.bidder_id is distinct from a.winner_id
     and not exists (select 1 from public.auction_unpaid u where u.auction_id = p_auction and u.buyer_id = b.bidder_id)
     and not exists (select 1 from public.auction_offers o where o.auction_id = p_auction and o.bidder_id = b.bidder_id)
     and not makinasal_private.auction_banned(b.bidder_id, null)
     and makinasal_private.is_premium(b.bidder_id)
   group by b.bidder_id
   order by max(b.amount) desc, min(b.created_at) asc
   limit 1;
  if c.bidder_id is null then
    insert into public.notifications(user_id, kind, title, body, url)
    values (a.seller_id, 'auction_ended', 'Sırada başka teklif veren kalmadı', coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
    return false;
  end if;
  insert into public.auction_offers(auction_id, bidder_id, amount, expires_at) values (p_auction, c.bidder_id, c.amount, now() + interval '48 hours');
  insert into public.notifications(user_id, kind, title, body, url)
  values (c.bidder_id, 'second_chance', 'Açık artırmada sıra sana geldi: ' || makinasal_private.money(c.amount),
          coalesce(v_title, '') || ' · Kazanan vazgeçti. 48 saat içinde kabul edebilirsin.', '/ilanlar/' || a.listing_id::text);
  insert into public.notifications(user_id, kind, title, body, url)
  values (a.seller_id, 'auction_ended', 'Sıradaki teklif verene teklif gönderildi: ' || makinasal_private.money(c.amount), coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  return true;
end $$;

-- Ceza: premium iadesiz iptal, hesap kalıcı + IP 30 gün men, kazanan boşalır, sıradakine teklif
create or replace function makinasal_private.penalize_backout(p_unpaid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare u record; a record; v_title text; ip record;
begin
  select * into u from public.auction_unpaid where id = p_unpaid;
  select * into a from public.auctions where id = u.auction_id for update;
  update public.auction_unpaid set status = 'confirmed', resolved_at = now() where id = p_unpaid;
  update public.profiles set is_premium = false, premium_plan = null, premium_until = null where id = u.buyer_id;
  perform public.sync_premium(u.buyer_id);
  insert into public.auction_bans(user_id, until, reason, auction_id) values (u.buyer_id, null, u.source, u.auction_id);
  for ip in select distinct ip_hash from public.auction_bids where auction_id = u.auction_id and bidder_id = u.buyer_id and ip_hash is not null loop
    insert into public.auction_bans(ip_hash, until, reason, auction_id) values (ip.ip_hash, now() + interval '30 days', u.source, u.auction_id);
  end loop;
  if a.winner_id = u.buyer_id then update public.auctions set winner_id = null, winner_at = null where id = a.id; end if;
  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  insert into public.notifications(user_id, kind, title, body, url)
  values (u.buyer_id, 'unpaid', 'Açık artırma kuralları gereği premium üyeliğin iptal edildi',
          coalesce(v_title, '') || ' · Kazandığın açık artırmadan vazgeçtiğin için üyeliğin iadesiz iptal edildi ve açık artırmalara katılımın kapatıldı.',
          '/ilanlar/' || a.listing_id::text);
  perform makinasal_private.offer_next(a.id);
end $$;

-- Satıcı: "Alıcı ödeme yapmadı" (7 gün içinde) → yönetici incelemesi
create or replace function public.report_unpaid(p_auction uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare a record; v_title text; adm record;
begin
  select * into a from public.auctions where id = p_auction for update;
  if a is null or a.seller_id <> (select auth.uid()) then raise exception 'NOT_OWNER'; end if;
  if a.status <> 'ended' or a.winner_id is null then raise exception 'NO_WINNER'; end if;
  if a.winner_at < now() - interval '7 days' then raise exception 'REPORT_EXPIRED'; end if;
  insert into public.auction_unpaid(auction_id, buyer_id, source) values (p_auction, a.winner_id, 'seller_report');
  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  insert into public.notifications(user_id, kind, title, body, url)
  values (a.winner_id, 'unpaid', 'Satıcı ödeme yapmadığını bildirdi',
          coalesce(v_title, '') || ' · Ödeme yaptıysan 48 saat içinde Destek''ten bize yaz; aksi halde premium üyeliğin iadesiz iptal edilir.', '/destek');
  for adm in select id from auth.users where raw_app_meta_data->>'role' = 'admin' loop
    insert into public.notifications(user_id, kind, title, body, url)
    values (adm.id, 'unpaid', 'İncelenecek açık artırma bildirimi', coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  end loop;
exception when unique_violation then raise exception 'ALREADY_REPORTED';
end $$;

-- Kazanan: "Satın almaktan vazgeçiyorum" → ceza hemen uygulanır
create or replace function public.back_out_auction(p_auction uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare a record; v_id uuid;
begin
  select * into a from public.auctions where id = p_auction for update;
  if a is null or a.winner_id is distinct from (select auth.uid()) then raise exception 'NOT_WINNER'; end if;
  if exists (select 1 from public.auction_unpaid where auction_id = p_auction and buyer_id = a.winner_id and status = 'confirmed') then
    raise exception 'ALREADY_REPORTED';
  end if;
  insert into public.auction_unpaid(auction_id, buyer_id, source, status) values (p_auction, a.winner_id, 'buyer_backout', 'pending')
  on conflict (auction_id, buyer_id) do update set source = 'buyer_backout'
  returning id into v_id;
  perform makinasal_private.penalize_backout(v_id);
end $$;

-- Sıradaki teklif veren: kabul / ret
create or replace function public.respond_offer(p_auction uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); o record; a record; v_title text; v_thread uuid;
begin
  select * into o from public.auction_offers where auction_id = p_auction and bidder_id = v_uid and status = 'pending' for update;
  if o is null or o.expires_at <= now() then raise exception 'NO_OFFER'; end if;
  select * into a from public.auctions where id = p_auction for update;
  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  if not p_accept then
    update public.auction_offers set status = 'declined' where id = o.id;
    perform makinasal_private.offer_next(p_auction);
    return;
  end if;
  if not makinasal_private.is_premium(v_uid) then raise exception 'PREMIUM_REQUIRED'; end if;
  update public.auction_offers set status = 'accepted' where id = o.id;
  update public.auctions set winner_id = v_uid, winner_at = now(), current_price = o.amount where id = p_auction;
  select id into v_thread from public.threads where listing_id = a.listing_id and buyer_id = v_uid limit 1;
  if v_thread is null then
    insert into public.threads(listing_id, buyer_id, seller_id) values (a.listing_id, v_uid, a.seller_id) returning id into v_thread;
  end if;
  insert into public.notifications(user_id, kind, title, body, url)
  values (a.seller_id, 'auction_ended', 'Sıradaki teklif veren kabul etti: ' || makinasal_private.money(o.amount), coalesce(v_title, ''), '/mesajlar/' || v_thread::text);
end $$;

-- Yönetici: inceleme listesi ve karar
create or replace function public.admin_unpaid_reports()
returns table(id uuid, auction_id uuid, listing_id uuid, title text, amount numeric, buyer text, seller text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;
  return query
    select u.id, a.id, l.id, l.title, a.current_price,
           coalesce(nullif(bp.full_name, ''), 'Üye'), coalesce(nullif(sp.store_name, ''), nullif(sp.full_name, ''), 'Üye'), u.created_at
      from public.auction_unpaid u
      join public.auctions a on a.id = u.auction_id
      join public.listings l on l.id = a.listing_id
      left join public.profiles bp on bp.id = u.buyer_id
      left join public.profiles sp on sp.id = a.seller_id
     where u.status = 'pending'
     order by u.created_at;
end $$;

create or replace function public.admin_resolve_unpaid(p_id uuid, p_confirm boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare u record; a record;
begin
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;
  select * into u from public.auction_unpaid where id = p_id and status = 'pending' for update;
  if u is null then raise exception 'NOT_FOUND'; end if;
  if p_confirm then
    perform makinasal_private.penalize_backout(p_id);
  else
    update public.auction_unpaid set status = 'rejected', resolved_at = now() where id = p_id;
    select * into a from public.auctions where id = u.auction_id;
    insert into public.notifications(user_id, kind, title, body, url)
    values (a.seller_id, 'unpaid', 'Ödeme bildirimin kabul edilmedi', 'Alıcı ödemeyi yaptığını belgeledi veya bildirim kurallara uymadı.', '/ilanlar/' || a.listing_id::text);
  end if;
end $$;

-- Bitiş görevi: kazanan zamanı + süresi dolan teklifler sıradakine geçer
create or replace function makinasal_private.close_auctions()
returns integer language plpgsql security definer set search_path = ''
as $$
declare a record; o record; v_title text; v_thread uuid; n integer := 0;
begin
  for a in select * from public.auctions where status = 'active' and ends_at <= now() for update skip locked loop
    update public.auctions set status = 'ended', winner_id = a.leader_id, winner_at = case when a.leader_id is not null then now() end where id = a.id;
    select left(title, 100) into v_title from public.listings where id = a.listing_id;
    v_thread := null;
    if a.leader_id is not null then
      select id into v_thread from public.threads where listing_id = a.listing_id and buyer_id = a.leader_id limit 1;
      if v_thread is null then
        begin
          insert into public.threads(listing_id, buyer_id, seller_id) values (a.listing_id, a.leader_id, a.seller_id) returning id into v_thread;
        exception when others then v_thread := null;
        end;
      end if;
      insert into public.notifications(user_id, kind, title, body, url)
      values (a.leader_id, 'auction_won', 'Açık artırmayı kazandın: ' || makinasal_private.money(a.current_price), coalesce(v_title, '') || ' · Ödemeyi yapmazsan premium üyeliğin iadesiz iptal edilir.',
              coalesce('/mesajlar/' || v_thread::text, '/ilanlar/' || a.listing_id::text));
      insert into public.notifications(user_id, kind, title, body, url)
      values (a.seller_id, 'auction_ended', 'Açık artırman bitti: ' || makinasal_private.money(a.current_price), coalesce(v_title, ''),
              coalesce('/mesajlar/' || v_thread::text, '/ilanlar/' || a.listing_id::text));
    else
      insert into public.notifications(user_id, kind, title, body, url)
      values (a.seller_id, 'auction_ended', 'Açık artırman teklif almadan bitti', coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
    end if;
    n := n + 1;
  end loop;
  for o in select * from public.auction_offers where status = 'pending' and expires_at <= now() for update skip locked loop
    update public.auction_offers set status = 'expired' where id = o.id;
    perform makinasal_private.offer_next(o.auction_id);
  end loop;
  return n;
end $$;

-- Video: yalnızca premium yükler ---------------------------------------------------------------------------
drop policy if exists "video yükle" on storage.objects;
create policy "video yükle" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.my_premium_active()));

create or replace function makinasal_private.guard_video_path()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.video_path is not null and split_part(new.video_path, '/', 1) <> new.seller_id::text then
    raise exception 'INVALID_VIDEO_PATH';
  end if;
  if new.video_path is not null and (tg_op = 'INSERT' or new.video_path is distinct from old.video_path)
     and (select auth.uid()) is not null and not makinasal_private.is_premium((select auth.uid())) then
    raise exception 'PREMIUM_REQUIRED';
  end if;
  return new;
end $$;

-- Satılan / kaldırılan ilanların videoları 30 gün sonra silinir (Edge Function 'cleanup-videos', günlük)
alter table public.listings add column if not exists status_changed_at timestamptz not null default now();
create or replace function makinasal_private.track_status_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then new.status_changed_at := now();
  else new.status_changed_at := old.status_changed_at; end if;
  return new;
end $$;
drop trigger if exists listings_status_changed on public.listings;
create trigger listings_status_changed before update on public.listings
  for each row execute function makinasal_private.track_status_change();

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret', 'Zamanlanmış Edge Function çağrıları');
  end if;
end $$;
create or replace function public.cron_secret_ok(p text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret' and decrypted_secret = p) $$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-videos';
select cron.schedule('cleanup-videos', '17 3 * * *', $cron$
  select net.http_post(
    url := 'https://iovzgulfkahbkahcpnhb.supabase.co/functions/v1/cleanup-videos',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb)
$cron$);

-- İzinler --------------------------------------------------------------------------------------------------
revoke all on function public.withdraw_bid(uuid, numeric) from public, anon;
grant execute on function public.withdraw_bid(uuid, numeric) to authenticated;
revoke all on function public.my_auction_details(uuid) from public, anon;
grant execute on function public.my_auction_details(uuid) to authenticated;
revoke all on function public.report_unpaid(uuid) from public, anon;
grant execute on function public.report_unpaid(uuid) to authenticated;
revoke all on function public.back_out_auction(uuid) from public, anon;
grant execute on function public.back_out_auction(uuid) to authenticated;
revoke all on function public.respond_offer(uuid, boolean) from public, anon;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
revoke all on function public.admin_unpaid_reports() from public, anon;
grant execute on function public.admin_unpaid_reports() to authenticated;
revoke all on function public.admin_resolve_unpaid(uuid, boolean) from public, anon;
grant execute on function public.admin_resolve_unpaid(uuid, boolean) to authenticated;
revoke all on function makinasal_private.is_premium(uuid) from public, anon, authenticated;
revoke all on function makinasal_private.request_ip_hash() from public, anon, authenticated;
revoke all on function makinasal_private.human_left(timestamptz) from public, anon, authenticated;
revoke all on function makinasal_private.auction_banned(uuid, text) from public, anon, authenticated;
revoke all on function makinasal_private.recompute_auction(uuid) from public, anon, authenticated;
revoke all on function makinasal_private.bidder_no(uuid, uuid) from public, anon, authenticated;
revoke all on function makinasal_private.offer_next(uuid) from public, anon, authenticated;
revoke all on function makinasal_private.penalize_backout(uuid) from public, anon, authenticated;
revoke all on function makinasal_private.track_status_change() from public, anon, authenticated;
