-- Moderation changes content, not harmless status/boost bookkeeping.
create or replace function makinasal_private.guard_moderation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_moderator() then
  if tg_op='INSERT' then new.moderation_status:='pending';
  elsif (to_jsonb(new)-array['status','moderation_status','confirmed_at','boosted_until','prev_price']) is distinct from (to_jsonb(old)-array['status','moderation_status','confirmed_at','boosted_until','prev_price']) then new.moderation_status:='pending';
  else new.moderation_status:=old.moderation_status; end if;
 end if;
 return new;
end $$;
-- Durable limits apply to direct database clients, not only the UI.
create table makinasal_private.request_buckets(key text primary key, started_at timestamptz not null, hits int not null);
alter table makinasal_private.request_buckets enable row level security;
revoke all on makinasal_private.request_buckets from public,anon,authenticated;
create function makinasal_private.take_limit(k text, max_hits int, seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
 insert into makinasal_private.request_buckets values(k,clock_timestamp(),1)
 on conflict(key) do update set hits=case when makinasal_private.request_buckets.started_at<clock_timestamp()-make_interval(secs=>seconds) then 1 else makinasal_private.request_buckets.hits+1 end,
 started_at=case when makinasal_private.request_buckets.started_at<clock_timestamp()-make_interval(secs=>seconds) then clock_timestamp() else makinasal_private.request_buckets.started_at end returning hits into n;
 return n<=max_hits;
end $$;
revoke all on function makinasal_private.take_limit(text,int,int) from public,anon,authenticated;
create function makinasal_private.guard_write_rate() returns trigger language plpgsql security definer set search_path='' as $$
declare lim int;
begin
 if auth.uid() is null then return new;end if;
 lim:=case tg_table_name when 'messages' then 30 when 'market_quote_messages' then 30 when 'reports' then 5 when 'listings' then 10 when 'market_posts' then 10 when 'market_quotes' then 15 else 20 end;
 if not makinasal_private.take_limit(tg_table_name||':'||auth.uid()::text,lim,60) then raise exception using errcode='23514',message='RATE_LIMIT: Çok fazla işlem. Bir dakika sonra tekrar dene.';end if;
 return new;
end $$;
revoke all on function makinasal_private.guard_write_rate() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['messages','market_quote_messages','reports','listings','market_posts','market_quotes'] loop execute format('create trigger guard_write_rate before insert on public.%I for each row execute function makinasal_private.guard_write_rate()',t);end loop;end $$;
-- Anonymous view counters were freely forgeable. Count signed-in unique viewers once per day.
create or replace function public.track_view(p_listing uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return;end if;
 if not exists(select 1 from public.listings where id=p_listing and status='active' and moderation_status='approved' and seller_id<>auth.uid()) then return;end if;
 if not makinasal_private.take_limit('view-total:'||auth.uid()::text,120,60) then return;end if;
 if makinasal_private.take_limit('view:'||auth.uid()::text||':'||p_listing::text,1,86400) then
 insert into public.listing_stats(listing_id,views) values(p_listing,1) on conflict(listing_id) do update set views=public.listing_stats.views+1;
 end if;
end $$;
revoke all on function public.track_view(uuid) from public,anon;
grant execute on function public.track_view(uuid) to authenticated;
