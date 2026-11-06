-- Kullanıcı engelleme ve mesaj şikayeti.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
drop policy if exists "own blocks read" on public.user_blocks;
drop policy if exists "own blocks insert" on public.user_blocks;
drop policy if exists "own blocks delete" on public.user_blocks;
create policy "own blocks read" on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "own blocks insert" on public.user_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "own blocks delete" on public.user_blocks for delete to authenticated using (blocker_id = (select auth.uid()));
grant select, insert, delete on public.user_blocks to authenticated;

create or replace function makinasal_moderation.is_blocked(p_a uuid, p_b uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.user_blocks where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a))
$$;

-- Engelleme varsa mesaj, konuşma başlatma ve teklif yazışması reddedilir.
create or replace function makinasal_moderation.guard_blocked_message() returns trigger
 language plpgsql security definer set search_path = '' as $$
declare v_other uuid;
begin
 if tg_table_name = 'messages' then
  select case when t.buyer_id = new.sender_id then t.seller_id else t.buyer_id end into v_other from public.threads t where t.id = new.thread_id;
 elsif tg_table_name = 'market_quote_messages' then
  select case when q.owner_id = new.sender_id then q.bidder_id else q.owner_id end into v_other from public.market_quotes q where q.id = new.quote_id;
 elsif tg_table_name = 'threads' then
  v_other := new.seller_id;
  if makinasal_moderation.is_blocked(new.buyer_id, v_other) then
   raise exception using errcode = '42501', message = 'MESSAGE_BLOCKED: Bu kullanıcıyla mesajlaşma kapalı.';
  end if;
  return new;
 end if;
 if v_other is not null and makinasal_moderation.is_blocked(new.sender_id, v_other) then
  raise exception using errcode = '42501', message = 'MESSAGE_BLOCKED: Bu kullanıcıyla mesajlaşma kapalı.';
 end if;
 return new;
end $$;
drop trigger if exists messages_blocked on public.messages;
create trigger messages_blocked before insert on public.messages for each row execute function makinasal_moderation.guard_blocked_message();
drop trigger if exists quote_messages_blocked on public.market_quote_messages;
create trigger quote_messages_blocked before insert on public.market_quote_messages for each row execute function makinasal_moderation.guard_blocked_message();
drop trigger if exists threads_blocked on public.threads;
create trigger threads_blocked before insert on public.threads for each row execute function makinasal_moderation.guard_blocked_message();

-- Mesaj şikayetleri (mesajın o anki metni saklanır).
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  reported_user uuid,
  thread_id uuid,
  body_snapshot text,
  reason text not null check (reason in ('abuse', 'harassment', 'fraud', 'spam', 'other')),
  note text not null default '' check (length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);
create index if not exists message_reports_status_idx on public.message_reports (status, created_at desc);
alter table public.message_reports enable row level security;
drop policy if exists "own message reports read" on public.message_reports;
drop policy if exists "own message reports insert" on public.message_reports;
create policy "own message reports read" on public.message_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "own message reports insert" on public.message_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
grant select, insert (message_id, reason, note) on public.message_reports to authenticated;

create or replace function makinasal_moderation.fill_message_report() returns trigger
 language plpgsql security definer set search_path = '' as $$
declare m record;
begin
 select x.sender_id, x.thread_id, x.body, t.buyer_id, t.seller_id into m
   from public.messages x join public.threads t on t.id = x.thread_id where x.id = new.message_id;
 if m is null or new.reporter_id not in (m.buyer_id, m.seller_id) or m.sender_id = new.reporter_id then
  raise exception using errcode = '42501', message = 'Bu mesajı şikayet edemezsin.';
 end if;
 new.reported_user := m.sender_id; new.thread_id := m.thread_id; new.body_snapshot := left(m.body, 2000);
 new.status := 'open';
 return new;
end $$;
drop trigger if exists message_reports_fill on public.message_reports;
create trigger message_reports_fill before insert on public.message_reports for each row execute function makinasal_moderation.fill_message_report();

-- Yönetim: açık şikayetleri listele ve sonuçlandır.
create or replace function public.admin_message_reports() returns table (
  id uuid, created_at timestamptz, reason text, note text, body text, status text,
  reported_user uuid, reported_name text, reporter_name text, report_count bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_moderator() then raise exception 'Yetkisiz işlem'; end if;
 return query
  select r.id, r.created_at, r.reason, r.note, r.body_snapshot, r.status, r.reported_user,
         coalesce(p1.full_name, '?'), coalesce(p2.full_name, '?'),
         (select count(*) from public.message_reports z where z.reported_user = r.reported_user)
  from public.message_reports r
  left join public.profiles p1 on p1.id = r.reported_user
  left join public.profiles p2 on p2.id = r.reporter_id
  where r.status = 'open'
  order by r.created_at desc limit 200;
end $$;
create or replace function public.admin_resolve_message_report(p_id uuid, p_status text) returns void
 language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_moderator() then raise exception 'Yetkisiz işlem'; end if;
 if p_status not in ('actioned', 'dismissed') then raise exception 'Geçersiz durum'; end if;
 update public.message_reports set status = p_status where id = p_id;
end $$;
revoke execute on function public.admin_message_reports(), public.admin_resolve_message_report(uuid, text) from public, anon;
grant execute on function public.admin_message_reports(), public.admin_resolve_message_report(uuid, text) to authenticated;
revoke execute on function makinasal_moderation.is_blocked(uuid, uuid), makinasal_moderation.guard_blocked_message(), makinasal_moderation.fill_message_report() from public, anon, authenticated;
