-- Pending: not installed in production. Limits are consolidated in server_search_and_abuse_guards.
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

-- Maintenance of notification records only. Storage objects must be removed through Storage API after dry-run review, never SQL deletion of storage metadata.
create or replace function public.run_maintenance() returns jsonb language plpgsql security definer set search_path='' as $$
declare n int;
begin
 delete from public.notifications where read_at is not null and created_at < now()-interval '90 days';get diagnostics n=row_count;
 return jsonb_build_object('notifications',n,'orphan_photos',0);
end $$;
revoke all on function public.run_maintenance() from public,anon,authenticated;
revoke all on function public.notify_new_message() from public,anon,authenticated;
revoke all on function public.notify_price_drop() from public,anon,authenticated;
-- Deliberately unscheduled until deployment approval and retention policy are confirmed.
