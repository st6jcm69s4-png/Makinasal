create extension if not exists pg_trgm with schema extensions;
create or replace function public.search_fold(v text) returns text language sql immutable strict parallel safe set search_path='' as $$
 select translate(lower(translate(v,'Iİ','ii')),'ıöüçşğâîû','ioucsgaiu')
$$;
revoke all on function public.search_fold(text) from public;
grant execute on function public.search_fold(text) to anon,authenticated;
create or replace function public.brand_key(v text) returns text language sql immutable strict parallel safe set search_path='' as $$
 select case k when 'cat' then 'caterpillar' when 'catcaterpillar' then 'caterpillar' when 'mercedes' then 'mercedesbenz' when 'mercedesbenztrucks' then 'mercedesbenz' when 'renaulttrucks' then 'renault' when 'volvotrucks' then 'volvo' when 'fordtrucks' then 'ford' when 'faresinhandlers' then 'faresin' when 'doosanbobcat' then 'bobcat' when 'caseconstruction' then 'case' else k end from (select regexp_replace(public.search_fold(v),'[^a-z0-9]','','g') k) x
$$;
revoke all on function public.brand_key(text) from public;
grant execute on function public.brand_key(text) to anon,authenticated;
create index if not exists listing_search_text_idx on public.listings using gin (public.search_fold(coalesce(brand,'')||' '||coalesce(model,'')||' '||title||' '||coalesce(spec,'')||' '||coalesce(compat,'')) extensions.gin_trgm_ops) where status='active';
create index if not exists listing_active_order_idx on public.listings(created_at desc,id desc) where status='active';
create index if not exists listing_active_category_city_price_idx on public.listings(category,city,price,id) where status='active';
create index if not exists listing_brand_key_idx on public.listings(public.brand_key(brand)) where status='active';
create or replace function public.search_listings(p jsonb default '{}', count_only boolean default false) returns jsonb
language sql stable security invoker set search_path='' set statement_timeout='5s' as $$
 with args as (
 select left(btrim(coalesce(p->>'q','')),200) q,
 greatest(1,least(coalesce((p->>'page')::int,1),1000000)) page,
 coalesce(p->>'sort','rec') sort
 ), filtered as materialized (
 select l.*,s.seller_score,s.seller_reviews,s.deals,s.reports,pr.is_premium,
 coalesce((p->'distances'->>l.city)::numeric,99999) distance
 from public.listings l join public.profiles pr on pr.id=l.seller_id
 left join public.user_stats s on s.id=l.seller_id cross join args a
 where l.status='active'
 and (jsonb_array_length(coalesce(p->'categories','[]'))=0 or l.category in (select jsonb_array_elements_text(p->'categories')))
 and (coalesce(p->>'brand','')='' or public.brand_key(l.brand)=public.brand_key(p->>'brand'))
 and (coalesce(p->>'city','Tümü')='Tümü' or l.city=p->>'city')
 and (coalesce((p->>'maxPrice')::numeric,6000000)>=6000000 or l.price<=(p->>'maxPrice')::numeric)
 and (coalesce((p->>'part')::boolean,false) or (
 (nullif(p->>'useMin','') is null or (l.usage_value >= (p->>'useMin')::numeric and l.usage_unit=case when p->>'unit'='km' then 'km' else 'saat' end))
 and (nullif(p->>'useMax','') is null or (l.usage_value <= (p->>'useMax')::numeric and l.usage_unit=case when p->>'unit'='km' then 'km' else 'saat' end))
 and (nullif(p->>'yMin','') is null or l.year >= (p->>'yMin')::numeric)
 and (nullif(p->>'yMax','') is null or l.year <= (p->>'yMax')::numeric)))
 and (coalesce((p->>'minScore')::numeric,0)=0 or (coalesce(s.seller_reviews,0)>0 and s.seller_score >= (p->>'minScore')::numeric) or (coalesce(s.seller_reviews,0)=0 and coalesce((p->>'incNew')::boolean,true)))
 and (not coalesce((p->>'ver')::boolean,false) or (pr.verified_phone and pr.verified_id and (not pr.is_store or pr.verified_tax)))
 and (not coalesce((p->>'hide')::boolean,false) or not (coalesce(s.reports,0)>=2 or (coalesce(s.deals,0)>=3 and coalesce(s.seller_reviews,0)>0 and s.seller_score<3)))
 and (not coalesce((p->>'takas')::boolean,false) or l.takas)
 and (coalesce((p->>'near')::numeric,0)=0 or coalesce((p->'distances'->>l.city)::numeric,99999)<=(p->>'near')::numeric)
 and (nullif(p->>'since','') is null or l.created_at>(p->>'since')::timestamptz)
 and (a.q='' or public.search_fold(coalesce(l.brand,'')||' '||coalesce(l.model,'')||' '||l.title||' '||coalesce(l.spec,'')||' '||coalesce(l.compat,'')) like '%'||replace(replace(replace(public.search_fold(a.q),'\','\\'),'%','\%'),'_','\_')||'%' escape '\')
 ), page_rows as (
 select f.* from filtered f cross join args a order by
 case when a.sort='rec' then (f.is_premium or coalesce(f.boosted_until>now(),false))::int end desc nulls last,
 case when a.sort='pa' then f.price end asc nulls last,
 case when a.sort='pd' then f.price end desc nulls last,
 case when a.sort='near' then f.distance end asc nulls last,
 case when a.sort='trust' then case when f.seller_reviews>0 then f.seller_score else 0 end end desc nulls last,
 case when a.sort='drop' then case when f.prev_price>f.price then (f.prev_price-f.price)/f.prev_price else 0 end end desc nulls last,
 case when a.sort='ua' then case when f.usage_unit='km' then 1 else 0 end end asc nulls last,
 case when a.sort='ua' then f.usage_value end asc nulls last,
 case when a.sort='yd' then f.year end desc nulls last,
 case when a.sort='ya' then f.year end asc nulls last,
 f.created_at desc,f.id desc
 limit (case when count_only then 0 else 24 end) offset ((select page-1 from args)*24)
 ) select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg((to_jsonb(r)-'seller_score'-'seller_reviews'-'deals'-'reports'-'is_premium'-'distance')||jsonb_build_object('listing_photos',coalesce((select jsonb_agg(jsonb_build_object('path',ph.path,'position',ph.position) order by ph.position) from public.listing_photos ph where ph.listing_id=r.id),'[]'::jsonb))) from page_rows r),'[]'::jsonb))
$$;
revoke all on function public.search_listings(jsonb,boolean) from public;
grant execute on function public.search_listings(jsonb,boolean) to anon,authenticated;
