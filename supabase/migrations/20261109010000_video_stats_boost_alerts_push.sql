-- Rakiplerde olan eksikler: ilan videosu, satıcı istatistikleri, tek ilan öne çıkarma (yönetici),
-- teklif bildirimleri, kayıtlı arama uyarıları, fiyat düşüşü metni, telefona anlık bildirim (Expo push).

-- 1) İlan videosu: yalnızca YouTube / Vimeo bağlantısı (dosya yükleme yok; depolama maliyeti olmasın).
alter table public.listings add column if not exists video_url text;
alter table public.listings drop constraint if exists listings_video_url_check;
alter table public.listings add constraint listings_video_url_check check (
  video_url is null or (
    char_length(video_url) <= 300
    and video_url ~* '^https://((www|m)\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/|vimeo\.com/)[A-Za-z0-9_?=&/.-]+$'
  )
);

-- 2) Satıcı istatistikleri: kendi ilanların için görüntülenme, telefon, favori ve mesaj sayısı.
create or replace function public.my_listing_stats()
returns table(listing_id uuid, views integer, phones integer, favorites integer, threads integer)
language sql stable security definer set search_path = ''
as $$
  select l.id,
         coalesce(s.views, 0),
         coalesce(s.phones, 0),
         (select count(*)::int from public.favorites f where f.listing_id = l.id),
         (select count(*)::int from public.threads t where t.listing_id = l.id)
  from public.listings l
  left join public.listing_stats s on s.listing_id = l.id
  where l.seller_id = (select auth.uid()) and l.status <> 'removed'
$$;
revoke all on function public.my_listing_stats() from public, anon;
grant execute on function public.my_listing_stats() to authenticated;

-- 3) Tek ilan öne çıkarma: kullanıcılar boosted_until'ı değiştiremez (listing_flags);
--    yönetici fonksiyonu yalnızca bu işlem için kontrollü bir istisna açar.
create or replace function public.listing_flags()
returns trigger language plpgsql set search_path = 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.prev_price := null;
    new.confirmed_at := now();
    if auth.uid() is not null then new.boosted_until := null; end if;
  else
    if new.price < old.price then new.prev_price := old.price;
    elsif new.price > old.price then new.prev_price := null;
    else new.prev_price := old.prev_price; end if;
    if new.confirmed_at is distinct from old.confirmed_at then new.confirmed_at := now(); end if;
    if auth.uid() is not null and coalesce(current_setting('makinasal.boost_admin', true), '') <> 'on' then
      new.boosted_until := old.boosted_until;
    end if;
  end if;
  return new;
end $function$;

create or replace function public.admin_set_boost(p_listing uuid, p_days integer)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare v timestamptz;
begin
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;
  if p_days is null or p_days < 0 or p_days > 90 then raise exception 'INVALID_DAYS'; end if;
  perform set_config('makinasal.boost_admin', 'on', true);
  update public.listings
     set boosted_until = case when p_days = 0 then null
                              else greatest(coalesce(boosted_until, now()), now()) + make_interval(days => p_days) end
   where id = p_listing
  returning boosted_until into v;
  perform set_config('makinasal.boost_admin', 'off', true);
  if not found then raise exception 'NOT_FOUND'; end if;
  return v;
end $$;
revoke all on function public.admin_set_boost(uuid, integer) from public, anon;
grant execute on function public.admin_set_boost(uuid, integer) to authenticated;

-- 4) Fiyat düşüşü bildirimi: eski ve yeni fiyat metinde görünsün.
create or replace function public.notify_price_drop()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if new.price < old.price and new.status = 'active' and new.moderation_status = 'approved' then
    insert into public.notifications(user_id, kind, title, body, url)
    select f.user_id, 'price_drop', 'Favori ilanında fiyat düştü',
           left(new.title, 100) || ' · ' || replace(to_char(old.price, 'FM999,999,999,990'), ',', '.') || ' → ' || replace(to_char(new.price, 'FM999,999,999,990'), ',', '.') || ' TL',
           '/ilanlar/' || new.id::text
    from public.favorites f
    where f.listing_id = new.id and f.user_id is distinct from new.seller_id;
  end if;
  return new;
end $function$;

-- 5) İş Ağı teklif bildirimleri (yeni teklif ve teklif mesajı).
create or replace function makinasal_private.notify_quote()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_title text;
begin
  select left(title, 100) into v_title from public.market_posts where id = new.post_id;
  if new.owner_id is distinct from new.bidder_id then
    insert into public.notifications(user_id, kind, title, body, url)
    values (new.owner_id, 'quote', 'İlanına yeni teklif geldi', coalesce(v_title, ''), '/ag/ilan/' || new.post_id::text);
  end if;
  return new;
end $$;

create or replace function makinasal_private.notify_quote_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare q record; v_to uuid; v_title text;
begin
  select owner_id, bidder_id, post_id into q from public.market_quotes where id = new.quote_id;
  if q is null then return new; end if;
  v_to := case when new.sender_id = q.owner_id then q.bidder_id else q.owner_id end;
  if v_to is null or v_to = new.sender_id then return new; end if;
  select left(title, 100) into v_title from public.market_posts where id = q.post_id;
  insert into public.notifications(user_id, kind, title, body, url)
  values (v_to, 'quote_message', 'Teklifinle ilgili yeni mesaj', coalesce(v_title, ''), '/ag/ilan/' || q.post_id::text);
  return new;
end $$;

drop trigger if exists market_quotes_notify on public.market_quotes;
create trigger market_quotes_notify after insert on public.market_quotes
  for each row execute function makinasal_private.notify_quote();
drop trigger if exists market_quote_messages_notify on public.market_quote_messages;
create trigger market_quote_messages_notify after insert on public.market_quote_messages
  for each row execute function makinasal_private.notify_quote_message();
revoke all on function makinasal_private.notify_quote() from public, anon, authenticated;
revoke all on function makinasal_private.notify_quote_message() from public, anon, authenticated;

-- 6) Kayıtlı arama uyarıları: uygulamanın arama parametreleri (params) saklanır,
--    yarım saatte bir yeni uyan ilan varsa tek bir bildirim gönderilir.
alter table public.saved_searches add column if not exists params jsonb;
alter table public.saved_searches add column if not exists last_notified_at timestamptz;
alter table public.saved_searches drop constraint if exists saved_searches_params_check;
alter table public.saved_searches add constraint saved_searches_params_check
  check (params is null or (jsonb_typeof(params) = 'object' and octet_length(params::text) <= 4000));

create or replace function makinasal_private.saved_search_alerts()
returns integer language plpgsql security definer set search_path = ''
as $$
declare r record; n integer; v_sent integer := 0; v_now timestamptz := now();
begin
  for r in
    select id, user_id, params, coalesce(last_notified_at, created_at) as since
    from public.saved_searches
    where notify and params is not null
  loop
    begin
      n := (public.search_listings((r.params - 'page' - 'distances' - 'near') || jsonb_build_object('since', r.since), true)->>'total')::int;
    exception when others then n := 0;
    end;
    if n > 0 then
      insert into public.notifications(user_id, kind, title, body, url)
      values (r.user_id, 'saved_search',
              'Kayıtlı aramana uyan ' || n || ' yeni ilan',
              coalesce(nullif(r.params->>'q', ''), 'Kayıtlı aramalarına göz at'),
              '/kayitli-aramalar');
      v_sent := v_sent + 1;
    end if;
    update public.saved_searches set last_notified_at = v_now where id = r.id;
  end loop;
  return v_sent;
end $$;
revoke all on function makinasal_private.saved_search_alerts() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'saved-search-alerts';
select cron.schedule('saved-search-alerts', '*/30 * * * *', $$select makinasal_private.saved_search_alerts()$$);

-- 7) Telefona anlık bildirim (Expo push servisi). Her bildirim satırı telefona da gönderilir.
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_own_select on public.push_tokens;
create policy push_tokens_own_select on public.push_tokens for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists push_tokens_own_delete on public.push_tokens;
create policy push_tokens_own_delete on public.push_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update, truncate on public.push_tokens from anon, authenticated;

-- Aynı telefon başka hesaba geçerse eski kayıt silinip yenisi yazılır.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.push_tokens where token = p_token;
  insert into public.push_tokens(token, user_id, platform) values (p_token, v_uid, p_platform);
  -- Bir hesapta en fazla 10 cihaz
  delete from public.push_tokens where user_id = v_uid and token in (
    select token from public.push_tokens where user_id = v_uid order by updated_at desc offset 10);
end $$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

create or replace function makinasal_private.push_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', left(new.title, 120), 'body', left(coalesce(new.body, ''), 180),
           'sound', 'default', 'data', jsonb_build_object('url', new.url, 'id', new.id)))
    into msgs
    from public.push_tokens t where t.user_id = new.user_id;
  if msgs is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  return new; -- bildirim gönderilemese de uygulama içi bildirim kaydı bozulmasın
end $$;
revoke all on function makinasal_private.push_notification() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function makinasal_private.push_notification();

-- 8) Yeni bildirim türleri (teklif, teklif mesajı, kayıtlı arama).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['message', 'price_drop', 'quote', 'quote_message', 'saved_search']));
