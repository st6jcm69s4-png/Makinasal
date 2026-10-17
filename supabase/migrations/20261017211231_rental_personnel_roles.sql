-- Optional role preserves existing personnel listings without guessing their service.
alter table public.market_posts add column personnel_role text
  check (personnel_role in ('operator','driver','mechanic'));
alter table public.market_posts add constraint market_posts_personnel_kind
  check (personnel_role is null or kind = 'rental_operator');
grant update(personnel_role) on public.market_posts to authenticated;
