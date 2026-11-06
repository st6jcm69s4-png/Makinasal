-- "Kendini tanıt" eleman profili ayrıntıları (kullanabildiği makineler, deneyim, belgeler, geçmiş işler).
alter table public.market_posts add column if not exists details jsonb;
alter table public.market_posts drop constraint if exists market_posts_details_check;
alter table public.market_posts add constraint market_posts_details_check
  check (details is null or (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 12000));
grant select (details) on public.market_posts to anon, authenticated;
grant insert (details), update (details) on public.market_posts to authenticated;
-- Eleman kendini tanıtırken ücret beklentisi isteğe bağlı ("görüşülür"); fiyat yalnızca kiralık makinede zorunlu.
alter table public.market_posts drop constraint if exists market_posts_check2;
alter table public.market_posts add constraint market_posts_check2 check (kind <> 'rental_machine' or price is not null);
