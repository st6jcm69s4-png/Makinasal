-- Unknown legacy rental scope stays unknown; do not infer that an operator is included.
alter table public.market_posts add column rental_mode text check(rental_mode is null or (kind='rental_machine' and rental_mode in ('with_operator','machine_only')));
grant update(rental_mode) on public.market_posts to authenticated;
create index market_posts_rental_mode on public.market_posts(rental_mode,city,created_at desc) where kind='rental_machine' and status='open';
-- A new rental must explicitly declare its scope. Existing unknown rentals can still be closed/removed.
drop policy posts_insert on public.market_posts;
create policy posts_insert on public.market_posts for insert to authenticated with check(owner_id=(select auth.uid()) and (kind<>'rental_machine' or rental_mode is not null));
