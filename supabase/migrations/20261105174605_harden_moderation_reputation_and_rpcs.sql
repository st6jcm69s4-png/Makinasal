-- Keep the existing invoker view and its public, read-only aggregate table.
-- Read receipts do not change either participant's reputation.
drop trigger reputation_threads on public.threads;
create trigger reputation_threads
  after update of id, buyer_id, seller_id or delete on public.threads
  for each row execute function makinasal_private.sync_stats();

-- Report review is the only report update available to the API role.
revoke update on public.reports from public, anon, authenticated;
grant update (status, verified) on public.reports to authenticated;

-- Even a moderator who can see a pending listing must not open a new buyer thread.
alter policy "konuşma başlat" on public.threads to authenticated with check (
  buyer_id = (select auth.uid()) and buyer_id <> seller_id
  and exists (
    select 1 from public.listings l
    where l.id = threads.listing_id and l.seller_id = threads.seller_id
      and l.status = 'active' and l.moderation_status = 'approved'
  )
);

-- On UPDATE, resolve the participants from the stored thread, never the proposed key.
create or replace function public.guard_deal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  participant uuid := auth.uid();
  thread public.threads;
begin
  if tg_op = 'UPDATE' then
    new.thread_id := old.thread_id;
    new.completed_at := old.completed_at;
  else
    new.completed_at := null;
  end if;

  select * into thread from public.threads where id = new.thread_id;
  if tg_op = 'INSERT' then
    if participant is distinct from thread.buyer_id then new.buyer_confirmed := false; end if;
    if participant is distinct from thread.seller_id then new.seller_confirmed := false; end if;
  else
    if participant is distinct from thread.buyer_id then new.buyer_confirmed := old.buyer_confirmed; end if;
    if participant is distinct from thread.seller_id then new.seller_confirmed := old.seller_confirmed; end if;
  end if;
  if new.buyer_confirmed and new.seller_confirmed and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end $$;

-- A blocked request must not keep rewriting an exhausted bucket or incrementing its counter.
create or replace function makinasal_private.take_limit(k text, max_hits int, seconds int)
returns boolean language sql security definer set search_path = '' as $$
  with accepted as (
    insert into makinasal_private.request_buckets as bucket (key, started_at, hits)
    values (k, clock_timestamp(), 1)
    on conflict (key) do update set
      hits = case when bucket.started_at + make_interval(secs => seconds) <= excluded.started_at
                  then 1 else bucket.hits + 1 end,
      started_at = case when bucket.started_at + make_interval(secs => seconds) <= excluded.started_at
                        then excluded.started_at else bucket.started_at end
    where bucket.hits < max_hits
       or bucket.started_at + make_interval(secs => seconds) <= excluded.started_at
    returning 1
  )
  select exists (select 1 from accepted)
$$;

create or replace function public.listing_phone(p_listing uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  phone_number text;
  seller uuid;
begin
  if viewer is null or auth.jwt()->>'is_anonymous' = 'true' then
    raise insufficient_privilege using message = 'Telefonu görmek için giriş yapmalısın';
  end if;

  select p.phone, l.seller_id into phone_number, seller
  from public.listings l join public.profiles p on p.id = l.seller_id
  where l.id = p_listing and l.status = 'active' and l.moderation_status = 'approved';

  if nullif(btrim(phone_number), '') is null then return null; end if;
  if seller = viewer then return phone_number; end if;

  if not makinasal_private.take_limit('phone-minute:' || viewer, 20, 60)
     or not makinasal_private.take_limit('phone-day:' || viewer, 100, 86400) then
    raise sqlstate 'PT429' using message = 'Telefon numarası görüntüleme sınırına ulaştın. Daha sonra tekrar dene.';
  end if;

  if makinasal_private.take_limit('phone:' || viewer || ':' || p_listing, 1, 86400) then
    insert into public.listing_stats as stats (listing_id, phones) values (p_listing, 1)
    on conflict (listing_id) do update set phones = stats.phones + 1;
  end if;
  return phone_number;
end $$;

-- The private column is read only for the caller. This RPC is read-only and takes no target.
create or replace function public.my_phone() returns text
language sql stable security definer set search_path = '' as $$
  select p.phone from public.profiles p where p.id = (select auth.uid())
$$;

-- Only advance the caller's receipt when there is a new incoming message.
-- A repeat call on an already-read thread performs no write.
create or replace function public.mark_thread_read(p_thread uuid) returns void
language sql security definer set search_path = '' as $$
  with caller as (select auth.uid() as id),
  latest as (
    select m.created_at from public.threads visible
    join public.messages m on m.thread_id = visible.id, caller
    where visible.id = p_thread and caller.id in (visible.buyer_id, visible.seller_id)
      and m.sender_id <> caller.id
      and m.created_at > case when visible.buyer_id = caller.id
                              then visible.buyer_read_at else visible.seller_read_at end
      and m.created_at <= statement_timestamp()
    order by m.created_at desc
    limit 1
  )
  update public.threads t set
    buyer_read_at = case when t.buyer_id = caller.id then latest.created_at else t.buyer_read_at end,
    seller_read_at = case when t.seller_id = caller.id then latest.created_at else t.seller_read_at end
  from caller, latest
  where t.id = p_thread and (
    (t.buyer_id = caller.id and t.buyer_read_at < latest.created_at)
    or (t.seller_id = caller.id and t.seller_read_at < latest.created_at)
  )
$$;

revoke execute on function public.track_view(uuid), public.listing_phone(uuid),
  public.my_phone(), public.mark_thread_read(uuid) from public, anon;
grant execute on function public.track_view(uuid), public.listing_phone(uuid),
  public.my_phone(), public.mark_thread_read(uuid) to authenticated;
