-- İstek sınırlama (rate limit), uygulama içi bildirimler ve bakım işleri.

-- ===== Rate limit =====
create table if not exists public.rate_limit_hits(
  key text not null,
  bucket timestamptz not null,
  n int not null default 1,
  primary key (key, bucket)
);
alter table public.rate_limit_hits enable row level security; -- politika yok: yalnızca security definer fonksiyonlar yazar
revoke all on public.rate_limit_hits from anon, authenticated;

-- true: izin var, false: sınır aşıldı
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare b timestamptz; c int;
begin
  b := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_hits(key, bucket, n) values (p_key, b, 1)
  on conflict (key, bucket) do update set n = public.rate_limit_hits.n + 1
  returning n into c;
  return c <= p_max;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;

create or replace function public.client_key() returns text language plpgsql stable set search_path = '' as $$
declare h text;
begin
  begin
    h := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then h := '';
  end;
  return coalesce(nullif(trim(h), ''), (select auth.uid())::text, 'anon');
end $$;

-- Görüntülenme sayacı: aynı istemci aynı ilan için 10 dakikada en fazla 3 kez sayılır
create or replace function public.track_view(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.hit_rate_limit('view:' || public.client_key() || ':' || p_listing::text, 3, 600) then return; end if;
  if exists (select 1 from listings where id = p_listing and status = 'active' and seller_id is distinct from auth.uid()) then
    insert into listing_stats(listing_id, views) values (p_listing, 1)
    on conflict (listing_id) do update set views = listing_stats.views + 1;
  end if;
end $$;
grant execute on function public.track_view(uuid) to anon, authenticated;

create or replace function public.enforce_rate_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return new; end if;
  if tg_table_name = 'messages' and not public.hit_rate_limit('msg:' || uid, 20, 60) then
    raise exception 'Çok hızlı mesaj gönderiyorsun. Bir dakika sonra tekrar dene.' using errcode = '54000';
  elsif tg_table_name = 'listings' and not public.hit_rate_limit('listing:' || uid, 10, 3600) then
    raise exception 'Bir saatte en fazla 10 ilan verebilirsin.' using errcode = '54000';
  elsif tg_table_name = 'reports' and not public.hit_rate_limit('report:' || uid, 10, 3600) then
    raise exception 'Bir saatte en fazla 10 şikâyet gönderebilirsin.' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.enforce_rate_limit();
drop trigger if exists listings_rate_limit on public.listings;
create trigger listings_rate_limit before insert on public.listings for each row execute function public.enforce_rate_limit();
drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports for each row execute function public.enforce_rate_limit();

-- ===== Bildirimler =====
create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'price_drop')),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 300),
  url text not null default '/' check (url like '/%'),
  read_at timestamptz,
  emailed_at timestamptz, -- e-posta/SMS sağlayıcısı bağlanınca gönderim işi bunu doldurur
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_new_message() returns trigger language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select buyer_id, seller_id, listing_id into t from public.threads where id = new.thread_id;
  if t is null then return new; end if;
  insert into public.notifications(user_id, kind, title, body, url)
  values (case when new.sender_id = t.buyer_id then t.seller_id else t.buyer_id end,
          'message', 'Yeni mesajın var', left(new.body, 120), '/mesajlar/' || new.thread_id::text);
  return new;
end $$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_new_message();

create or replace function public.notify_price_drop() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.price < old.price and new.status = 'active' then
    insert into public.notifications(user_id, kind, title, body, url)
    select f.user_id, 'price_drop', 'Favori ilanında fiyat düştü', left(new.title, 120), '/ilanlar/' || new.id::text
    from public.favorites f where f.listing_id = new.id and f.user_id is distinct from new.seller_id;
  end if;
  return new;
end $$;
drop trigger if exists listings_price_drop_notify on public.listings;
create trigger listings_price_drop_notify after update of price on public.listings for each row execute function public.notify_price_drop();

create or replace function public.unread_notification_count() returns int
language sql stable security invoker set search_path = '' as $$
  select count(*)::int from public.notifications where user_id = (select auth.uid()) and read_at is null;
$$;
revoke all on function public.unread_notification_count() from public, anon;
grant execute on function public.unread_notification_count() to authenticated;

-- ===== Bakım: eski sayaçlar, okunmuş bildirimler ve sahipsiz fotoğraflar =====
create or replace function public.run_maintenance() returns jsonb language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int;
begin
  delete from public.rate_limit_hits where bucket < now() - interval '1 day'; get diagnostics a = row_count;
  delete from public.notifications where read_at is not null and created_at < now() - interval '90 days'; get diagnostics b = row_count;
  delete from storage.objects o
  where o.bucket_id = 'listing-photos' and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.listing_photos p where p.path = o.name);
  get diagnostics c = row_count;
  return jsonb_build_object('rate_hits', a, 'notifications', b, 'orphan_photos', c);
end $$;
revoke all on function public.run_maintenance() from public, anon, authenticated;

-- pg_cron etkinse her gece 03:00'te çalıştır (Supabase → Database → Extensions → pg_cron)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('makinasal-maintenance', '0 3 * * *', 'select public.run_maintenance()');
  end if;
end $$;
