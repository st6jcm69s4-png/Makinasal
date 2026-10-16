-- Public reputation is a read-only summary; private conversations/reports never
-- need to become readable in order to display another seller's reputation.
create schema if not exists makinasal_private;
revoke all on schema makinasal_private from public, anon, authenticated;
create table public.user_stats_summary (
 id uuid primary key references public.profiles(id) on delete cascade,
 score numeric not null default 0, review_count bigint not null default 0,
 deals bigint not null default 0, reports bigint not null default 0,
 seller_score numeric not null default 0, seller_reviews bigint not null default 0,
 buyer_score numeric not null default 0, buyer_reviews bigint not null default 0
);
alter table public.user_stats_summary enable row level security;
revoke all on public.user_stats_summary from public, anon, authenticated;
grant select on public.user_stats_summary to anon, authenticated;
create policy "public reputation summaries" on public.user_stats_summary for select to anon, authenticated using (true);

create function makinasal_private.refresh_stats(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null and current_setting('role', true) in ('anon','authenticated') then
  raise exception 'Authentication required';
 end if;
 -- Serialize each user's aggregate refresh, including concurrent reviews/deals.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 32));
 insert into public.user_stats_summary
 select p.id,
 coalesce((select avg(r.score) from public.reviews r where r.reviewee_id=p.id),0),
 (select count(*) from public.reviews r where r.reviewee_id=p.id),
 (select count(*) from public.threads t join public.deals d on d.thread_id=t.id where d.completed_at is not null and p.id in (t.buyer_id,t.seller_id)),
 (select count(*) from public.reports x left join public.listings l on l.id=x.listing_id where x.verified and (x.user_id=p.id or l.seller_id=p.id)),
 coalesce((select avg(r.score) from public.reviews r where r.reviewee_id=p.id and r.role='seller'),0),
 (select count(*) from public.reviews r where r.reviewee_id=p.id and r.role='seller'),
 coalesce((select avg(r.score) from public.reviews r where r.reviewee_id=p.id and r.role='buyer'),0),
 (select count(*) from public.reviews r where r.reviewee_id=p.id and r.role='buyer')
 from public.profiles p where p.id=p_user
 on conflict(id) do update set score=excluded.score, review_count=excluded.review_count,
 deals=excluded.deals,reports=excluded.reports,seller_score=excluded.seller_score,
 seller_reviews=excluded.seller_reviews,buyer_score=excluded.buyer_score,buyer_reviews=excluded.buyer_reviews;
end $$;
revoke all on function makinasal_private.refresh_stats(uuid) from public, anon, authenticated;

create function makinasal_private.sync_stats() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a uuid[] := '{}'; r jsonb; uid uuid;
begin
 if auth.uid() is null and current_setting('role', true) in ('anon','authenticated') then raise exception 'Authentication required'; end if;
 for r in select x from unnest(array[case when tg_op<>'DELETE' then to_jsonb(new) end, case when tg_op<>'INSERT' then to_jsonb(old) end]) x where x is not null loop
  case tg_table_name
   when 'profiles' then a:=array_append(a,(r->>'id')::uuid);
   when 'reviews' then a:=array_append(a,(r->>'reviewee_id')::uuid);
   when 'threads' then a:=a||array[(r->>'buyer_id')::uuid,(r->>'seller_id')::uuid];
   when 'deals' then a:=a||coalesce((select array[t.buyer_id,t.seller_id] from public.threads t where t.id=(r->>'thread_id')::uuid),'{}'::uuid[]);
   when 'reports' then
    a:=array_append(a,(r->>'user_id')::uuid);
    a:=array_append(a,(select l.seller_id from public.listings l where l.id=(r->>'listing_id')::uuid));
   when 'listings' then a:=array_append(a,(r->>'seller_id')::uuid);
  end case;
 end loop;
 for uid in select distinct x from unnest(a) x where x is not null order by x loop perform makinasal_private.refresh_stats(uid); end loop;
 return null;
end $$;
revoke all on function makinasal_private.sync_stats() from public, anon, authenticated;
create trigger reputation_profiles after insert on public.profiles for each row execute function makinasal_private.sync_stats();
create trigger reputation_reviews after insert or update or delete on public.reviews for each row execute function makinasal_private.sync_stats();
create trigger reputation_threads after insert or update or delete on public.threads for each row execute function makinasal_private.sync_stats();
create trigger reputation_deals after insert or update or delete on public.deals for each row execute function makinasal_private.sync_stats();
create trigger reputation_reports after insert or update or delete on public.reports for each row execute function makinasal_private.sync_stats();
create trigger reputation_listings after update of seller_id or delete on public.listings for each row execute function makinasal_private.sync_stats();
select makinasal_private.refresh_stats(id) from public.profiles order by id;
create or replace view public.user_stats with (security_invoker=true) as select * from public.user_stats_summary;
grant select on public.user_stats to anon, authenticated;

-- Only a server-managed app_metadata claim grants moderation access.
create function public.is_moderator() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
$$;
revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to anon, authenticated;
alter table public.listings add column moderation_status text not null default 'approved'
 check (moderation_status in ('pending','approved','rejected'));
create function makinasal_private.guard_moderation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_moderator() then new.moderation_status:='pending'; end if;
 return new;
end $$;
revoke all on function makinasal_private.guard_moderation() from public, anon, authenticated;
create trigger listings_moderation before insert or update on public.listings for each row execute function makinasal_private.guard_moderation();
drop policy "aktif ilanlar herkese açık" on public.listings;
create policy "visible or owned listings" on public.listings for select to anon, authenticated
 using (seller_id=(select auth.uid()) or (select public.is_moderator()) or (status in ('active','sold') and moderation_status='approved'));
create policy "moderator listing update" on public.listings for update to authenticated
 using ((select public.is_moderator())) with check ((select public.is_moderator()));
drop policy "foto görülür" on public.listing_photos;
create policy "visible listing photos" on public.listing_photos for select to anon, authenticated
 using (exists(select 1 from public.listings l where l.id=listing_id));
create policy "moderator reports read" on public.reports for select to authenticated using ((select public.is_moderator()));
create policy "moderator reports update" on public.reports for update to authenticated
 using ((select public.is_moderator())) with check ((select public.is_moderator()));
grant update(status,verified) on public.reports to authenticated;
alter table public.reports add constraint reports_status_valid check(status in ('open','resolved','dismissed'));
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id);
create index if not exists threads_seller_idx on public.threads(seller_id);
create index if not exists threads_buyer_idx on public.threads(buyer_id);
create index if not exists reports_verified_user_idx on public.reports(user_id) where verified;
create index if not exists reports_verified_listing_idx on public.reports(listing_id) where verified;
