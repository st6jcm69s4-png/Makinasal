-- İllere göre ilan sayıları sunucuda hesaplanır (önceden istemci en fazla 5000 ilan çekip sayıyordu).
create or replace function public.listing_city_counts()
returns table(city text, n integer)
language sql stable security invoker set search_path = ''
as $$
  select l.city, count(*)::int
  from public.listings l
  where l.status = 'active' and l.moderation_status = 'approved'
  group by l.city
  order by 2 desc, 1
$$;
revoke all on function public.listing_city_counts() from public;
grant execute on function public.listing_city_counts() to anon, authenticated;
