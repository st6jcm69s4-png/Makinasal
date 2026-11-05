-- Performans: yabancı anahtarlara indeks ve RLS içinde auth.uid() çağrısını bir kez hesaplatma.

create index if not exists favorites_listing_id_idx on public.favorites (listing_id);
create index if not exists listing_photos_listing_id_idx on public.listing_photos (listing_id);
create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists market_quote_messages_sender_id_idx on public.market_quote_messages (sender_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists payment_events_order_id_idx on public.payment_events (order_id);
create index if not exists payment_orders_seller_id_idx on public.payment_orders (seller_id);
create index if not exists reviews_reviewer_id_idx on public.reviews (reviewer_id);
create index if not exists saved_searches_user_id_idx on public.saved_searches (user_id);
create index if not exists service_requests_listing_id_idx on public.service_requests (listing_id);

do $$
declare
  r record;
  pat constant text := '(?<!select )auth\.uid\(\)';
  q text; w text; stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') ~* pat or coalesce(with_check,'') ~* pat)
  loop
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if r.qual is not null then
      q := regexp_replace(r.qual, pat, '(select auth.uid())', 'gi');
      stmt := stmt || ' using (' || q || ')';
    end if;
    if r.with_check is not null then
      w := regexp_replace(r.with_check, pat, '(select auth.uid())', 'gi');
      stmt := stmt || ' with check (' || w || ')';
    end if;
    execute stmt;
  end loop;
end $$;
