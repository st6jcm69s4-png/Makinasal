-- A) İlan videosunu telefondan yükleme (listing-videos deposu) — en fazla 50 MB, mp4/mov.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-videos', 'listing-videos', true, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "video yükle" on storage.objects;
create policy "video yükle" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "video sil" on storage.objects;
create policy "video sil" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.listings add column if not exists video_path text;
alter table public.listings drop constraint if exists listings_video_path_check;
alter table public.listings add constraint listings_video_path_check check (
  video_path is null or video_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]{6,80}\.(mp4|mov)$'
);

-- Video yolu yalnızca ilan sahibinin klasöründe olabilir.
create or replace function makinasal_private.guard_video_path()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.video_path is not null and split_part(new.video_path, '/', 1) <> new.seller_id::text then
    raise exception 'INVALID_VIDEO_PATH';
  end if;
  return new;
end $$;
drop trigger if exists listings_video_path on public.listings;
create trigger listings_video_path before insert or update of video_path on public.listings
  for each row execute function makinasal_private.guard_video_path();

-- B) Açık artırma
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  start_price numeric(14,2) not null check (start_price > 0 and start_price <= 999999999999),
  min_increment numeric(14,2) not null check (min_increment > 0 and min_increment <= 100000000),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  current_price numeric(14,2),
  bid_count integer not null default 0,
  leader_id uuid references auth.users(id) on delete set null,
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists auctions_one_active on public.auctions(listing_id) where status = 'active';
create index if not exists auctions_active_end on public.auctions(ends_at) where status = 'active';
create index if not exists auctions_seller_idx on public.auctions(seller_id);
create index if not exists auctions_leader_idx on public.auctions(leader_id);
create index if not exists auctions_winner_idx on public.auctions(winner_id);

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists auction_bids_auction_idx on public.auction_bids(auction_id, amount desc);
create index if not exists auction_bids_bidder_idx on public.auction_bids(bidder_id);

alter table public.auctions enable row level security;
alter table public.auction_bids enable row level security;

-- Herkes açık artırmayı görür; kimin önde olduğu (leader_id / winner_id) gizli.
drop policy if exists auctions_read on public.auctions;
create policy auctions_read on public.auctions for select to anon, authenticated using (true);
revoke all on public.auctions from anon, authenticated;
grant select (id, listing_id, seller_id, start_price, min_increment, ends_at, status, current_price, bid_count, created_at)
  on public.auctions to anon, authenticated;

-- Teklifler: herkes yalnızca kendi tekliflerini doğrudan okur; geçmiş RPC ile anonim gösterilir.
drop policy if exists auction_bids_own on public.auction_bids;
create policy auction_bids_own on public.auction_bids for select to authenticated using (bidder_id = (select auth.uid()));
revoke all on public.auction_bids from anon, authenticated;
grant select on public.auction_bids to authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['message', 'price_drop', 'quote', 'quote_message', 'saved_search',
                           'bid', 'outbid', 'auction_won', 'auction_ended']));

create or replace function makinasal_private.money(n numeric)
returns text language sql immutable set search_path = ''
as $$ select replace(to_char(n, 'FM999,999,999,990'), ',', '.') || ' TL' $$;

-- Açık artırma başlat: ilan sahibi, yayında ve onaylı ilan, 1-10 gün.
create or replace function public.create_auction(p_listing uuid, p_start numeric, p_increment numeric, p_days integer)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); l record; v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_days not in (1, 3, 5, 7, 10) then raise exception 'INVALID_DAYS'; end if;
  if p_start is null or p_start <= 0 or p_start > 999999999999 then raise exception 'INVALID_PRICE'; end if;
  if p_increment is null or p_increment <= 0 or p_increment > p_start then raise exception 'INVALID_INCREMENT'; end if;
  select id, seller_id, status, moderation_status into l from public.listings where id = p_listing for update;
  if l is null or l.seller_id <> v_uid then raise exception 'NOT_OWNER'; end if;
  if l.status <> 'active' or l.moderation_status <> 'approved' then raise exception 'LISTING_NOT_LIVE'; end if;
  if exists (select 1 from public.auctions where listing_id = p_listing and status = 'active') then raise exception 'AUCTION_EXISTS'; end if;
  if (select count(*) from public.auctions where seller_id = v_uid and status = 'active') >= 10 then raise exception 'AUCTION_LIMIT'; end if;
  insert into public.auctions(listing_id, seller_id, start_price, min_increment, ends_at)
  values (p_listing, v_uid, round(p_start, 2), round(p_increment, 2), now() + make_interval(days => p_days))
  returning id into v_id;
  return v_id;
end $$;

-- İptal: yalnızca sahibi ve henüz teklif yoksa.
create or replace function public.cancel_auction(p_auction uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare a record;
begin
  select * into a from public.auctions where id = p_auction for update;
  if a is null or a.seller_id <> (select auth.uid()) then raise exception 'NOT_OWNER'; end if;
  if a.status <> 'active' then raise exception 'AUCTION_CLOSED'; end if;
  if a.bid_count > 0 then raise exception 'HAS_BIDS'; end if;
  update public.auctions set status = 'cancelled' where id = p_auction;
end $$;

-- Teklif ver: kilitli, son 5 dakikada gelen teklif süreyi 5 dakika uzatır.
create or replace function public.place_bid(p_auction uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); a record; v_min numeric; v_title text; v_prev uuid; v_end timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if a is null then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.seller_id = v_uid then raise exception 'OWN_AUCTION'; end if;
  if a.leader_id = v_uid then raise exception 'ALREADY_LEADING'; end if;
  if makinasal_moderation.is_blocked(v_uid, a.seller_id) then raise exception 'MESSAGE_BLOCKED'; end if;
  if not exists (select 1 from public.listings where id = a.listing_id and status = 'active' and moderation_status = 'approved') then
    raise exception 'LISTING_NOT_LIVE';
  end if;
  -- Dakikada en fazla 10 teklif (kötüye kullanım)
  if (select count(*) from public.auction_bids where bidder_id = v_uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'RATE_LIMIT';
  end if;
  v_min := case when a.current_price is null then a.start_price else a.current_price + a.min_increment end;
  if p_amount is null or p_amount < v_min then raise exception 'BID_TOO_LOW:%', v_min; end if;
  if p_amount > 999999999999 then raise exception 'INVALID_PRICE'; end if;

  insert into public.auction_bids(auction_id, bidder_id, amount) values (p_auction, v_uid, round(p_amount, 2));
  v_prev := a.leader_id;
  v_end := case when a.ends_at - now() < interval '5 minutes' then now() + interval '5 minutes' else a.ends_at end;
  update public.auctions
     set current_price = round(p_amount, 2), leader_id = v_uid, bid_count = bid_count + 1, ends_at = v_end
   where id = p_auction;

  select left(title, 100) into v_title from public.listings where id = a.listing_id;
  insert into public.notifications(user_id, kind, title, body, url)
  values (a.seller_id, 'bid', 'Açık artırmana yeni teklif: ' || makinasal_private.money(round(p_amount, 2)), coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  if v_prev is not null and v_prev <> v_uid then
    insert into public.notifications(user_id, kind, title, body, url)
    values (v_prev, 'outbid', 'Teklifin geçildi: ' || makinasal_private.money(round(p_amount, 2)), coalesce(v_title, ''), '/ilanlar/' || a.listing_id::text);
  end if;
  return jsonb_build_object('current_price', round(p_amount, 2), 'ends_at', v_end, 'bid_count', a.bid_count + 1);
end $$;

-- Teklif geçmişi: tutar, zaman, "Teklif veren 1/2/3" ve benim mi?
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
  where b.auction_id = p_auction
  order by b.amount desc
  limit 30
$$;

-- Benim durumum: önde miyim, kazandım mı?
create or replace function public.my_auction_status(p_auction uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when a.winner_id = (select auth.uid()) then 'won'
    when a.status = 'active' and a.leader_id = (select auth.uid()) then 'leading'
    when exists (select 1 from public.auction_bids b where b.auction_id = a.id and b.bidder_id = (select auth.uid())) then 'outbid'
    else null end
  from public.auctions a where a.id = p_auction
$$;

-- Aktif açık artırmalar listesi (yalnızca yayındaki onaylı ilanlar)
create or replace function public.active_auctions(p_limit integer default 50)
returns table(id uuid, listing_id uuid, title text, city text, year integer, current_price numeric, start_price numeric,
              bid_count integer, ends_at timestamptz, photo text)
language sql stable security definer set search_path = ''
as $$
  select a.id, l.id, l.title, l.city, l.year, a.current_price, a.start_price, a.bid_count, a.ends_at,
         (select p.path from public.listing_photos p where p.listing_id = l.id order by p.position limit 1)
  from public.auctions a join public.listings l on l.id = a.listing_id
  where a.status = 'active' and a.ends_at > now() and l.status = 'active' and l.moderation_status = 'approved'
  order by a.ends_at
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

-- Bitiş: dakikada bir. Kazanana ve satıcıya bildirim, aralarında mesajlaşma açılır.
create or replace function makinasal_private.close_auctions()
returns integer language plpgsql security definer set search_path = ''
as $$
declare a record; v_title text; v_thread uuid; n integer := 0;
begin
  for a in select * from public.auctions where status = 'active' and ends_at <= now() for update skip locked loop
    update public.auctions set status = 'ended', winner_id = a.leader_id where id = a.id;
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
      values (a.leader_id, 'auction_won', 'Açık artırmayı kazandın: ' || makinasal_private.money(a.current_price), coalesce(v_title, ''),
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
  return n;
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'close-auctions';
select cron.schedule('close-auctions', '* * * * *', $$select makinasal_private.close_auctions()$$);

-- İlan yayından kalkarsa (satıldı/kaldırıldı/duraklatıldı) açık artırma iptal edilir, öndeki kişiye haber verilir.
create or replace function makinasal_private.cancel_auction_on_listing_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare a record;
begin
  if new.status <> 'active' and old.status = 'active' then
    for a in select * from public.auctions where listing_id = new.id and status = 'active' loop
      update public.auctions set status = 'cancelled' where id = a.id;
      if a.leader_id is not null then
        insert into public.notifications(user_id, kind, title, body, url)
        values (a.leader_id, 'auction_ended', 'Teklif verdiğin açık artırma iptal edildi', left(new.title, 100), '/ilanlar/' || new.id::text);
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists listings_cancel_auction on public.listings;
create trigger listings_cancel_auction after update of status on public.listings
  for each row execute function makinasal_private.cancel_auction_on_listing_change();

revoke all on function public.create_auction(uuid, numeric, numeric, integer) from public, anon;
grant execute on function public.create_auction(uuid, numeric, numeric, integer) to authenticated;
revoke all on function public.cancel_auction(uuid) from public, anon;
grant execute on function public.cancel_auction(uuid) to authenticated;
revoke all on function public.place_bid(uuid, numeric) from public, anon;
grant execute on function public.place_bid(uuid, numeric) to authenticated;
revoke all on function public.auction_bid_history(uuid) from public;
grant execute on function public.auction_bid_history(uuid) to anon, authenticated;
revoke all on function public.my_auction_status(uuid) from public, anon;
grant execute on function public.my_auction_status(uuid) to authenticated;
revoke all on function public.active_auctions(integer) from public;
grant execute on function public.active_auctions(integer) to anon, authenticated;
revoke all on function makinasal_private.close_auctions() from public, anon, authenticated;
revoke all on function makinasal_private.cancel_auction_on_listing_change() from public, anon, authenticated;
revoke all on function makinasal_private.guard_video_path() from public, anon, authenticated;
revoke all on function makinasal_private.money(numeric) from public, anon, authenticated;
