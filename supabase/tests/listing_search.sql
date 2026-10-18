begin;
insert into auth.users(id,email,raw_user_meta_data) select md5('search-seller-'||i)::uuid,'search-fixture-'||i||'@example.invalid','{}' from generate_series(1,325) i;
insert into public.listings(id,seller_id,kind,category,title,price,city,brand,model,created_at)
select md5('search-fixture-'||i)::uuid,md5('search-seller-'||i)::uuid,'machine','Ekskavatör','SearchFixture20261018 '||i,10000+i,case when i%2=0 then 'Ankara' else 'İstanbul' end,'Caterpillar','M'||i,now()-make_interval(days=>i) from generate_series(1,325) i;
set local role anon;
do $$declare r jsonb; ids int;begin
 r:=public.search_listings('{"q":"SearchFixture20261018","sort":"new"}');
 if (r->>'total')::int<>325 or jsonb_array_length(r->'rows')<>24 then raise exception 'FAIL count/page';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018 325"}');
 if (r->>'total')::int<>1 then raise exception 'FAIL older than 300';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","city":"Ankara"}');if (r->>'total')::int<>162 then raise exception 'FAIL city';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","sort":"pa","page":14}');if jsonb_array_length(r->'rows')<>13 then raise exception 'FAIL last page';end if;
 if (r->'rows'->0->>'price')::numeric<>10313 then raise exception 'FAIL sort before pagination';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","brand":"CAT"}');if (r->>'total')::int<>325 then raise exception 'FAIL brand alias';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","categories":["Kamyon"]}');if (r->>'total')::int<>0 then raise exception 'FAIL category';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","maxPrice":10100}');if (r->>'total')::int<>100 then raise exception 'FAIL price';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018","near":50,"distances":{"Ankara":0,"İstanbul":350}}');if (r->>'total')::int<>162 then raise exception 'FAIL distance';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018%"}');if (r->>'total')::int<>0 then raise exception 'FAIL wildcard escaping';end if;
 r:=public.search_listings('{"q":"SearchFixture20261018"}',true);if jsonb_array_length(r->'rows')<>0 or (r->>'total')::int<>325 then raise exception 'FAIL count only';end if;
end $$;
rollback;
select 'PASS: 325 fixtures, older-than-300 search, database filtering/count/order/pages, aliases, literal wildcard, count-only; rolled back' result;
