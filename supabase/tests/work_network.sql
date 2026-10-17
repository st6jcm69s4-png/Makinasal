-- Execute as SQL administrator. All fixtures are rolled back; no email is sent.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','network-owner@example.invalid','{}'),
 ('22222222-2222-4222-8222-222222222222','network-bidder@example.invalid','{}'),
 ('33333333-3333-4333-8333-333333333333','network-other@example.invalid','{}');
insert into public.profiles(id,full_name) values
 ('11111111-1111-4111-8111-111111111111','Test owner'),
 ('22222222-2222-4222-8222-222222222222','Test bidder'),
 ('33333333-3333-4333-8333-333333333333','Test other') on conflict(id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.market_posts(id,owner_id,kind,title,description,category,city,district,start_date,end_date)
 values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','job','Dört günlük kamyon işi','Dört gün boyunca hafriyat taşıma işi, yakıt ve KDV dahil teklif bekleniyor.','Kamyon','Ankara','Sincan','2026-11-01','2026-11-04');
insert into public.service_providers(user_id,name,kind,description,city,district,service_cities,specialties,published)
 values('11111111-1111-4111-8111-111111111111','Test firma','excavation','Hafriyat ve temel kazısı hizmetleri sunuyoruz.','Ankara','Sincan',array['Ankara','Eskişehir'],array['Hafriyat'],false);
do $$ declare denied boolean:=false;begin
 begin insert into public.market_posts(owner_id,kind,title,description,category,city) values('22222222-2222-4222-8222-222222222222','job','Başkasına ilan','Geçersiz sahiplik ile açılan test ilanı.','Kamyon','Ankara'); exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: forged post owner';end if;
 denied:=false;begin insert into public.market_quotes(post_id,owner_id,bidder_id,display_name,amount,price_unit,note) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Self offer',100,'toplam','Kendi ilanına teklif test');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: self quote';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into public.market_quotes(id,post_id,owner_id,bidder_id,display_name,amount,price_unit,note)
 values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Test taşıma',10000,'gün','Yakıt ve KDV dahil dört gün müsaitim.');
do $$ declare denied boolean:=false;n int;begin
 begin update public.market_quotes set status='accepted' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: bidder accepts own quote';end if;
 update public.market_posts set title='Unauthorized edit' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider edits post';end if;
 if exists(select 1 from public.service_providers where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'FAIL: unpublished provider leak';end if;
end $$;
update public.market_quotes set amount=9500 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
insert into public.market_quote_messages(quote_id,sender_id,body) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Dört gün için toplam 38 bin TL.');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ declare denied boolean:=false;begin
 if exists(select 1 from public.market_quotes where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'FAIL: private quote leak';end if;
 if exists(select 1 from public.market_quote_messages where quote_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'FAIL: private message leak';end if;
 begin insert into public.market_quote_messages(quote_id,sender_id,body) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333','Unauthorized message');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: outsider messages';end if;
 denied:=false;begin insert into public.market_quotes(post_id,owner_id,bidder_id,display_name,amount,price_unit,note) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Forged owner',12000,'gün','Yanlış ilan sahibi ile teklif');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: forged quote owner';end if;
end $$;
insert into public.market_quotes(id,post_id,owner_id,bidder_id,display_name,amount,price_unit,note)
 values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','Other transport',12000,'gün','Yakıt ve KDV dahil alternatif teklif.');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare denied boolean:=false;begin
 if (select count(*) from public.market_quotes where post_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 then raise exception 'FAIL: owner cannot compare quotes';end if;
 begin update public.market_quotes set amount=1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: owner changes bidder price';end if;
end $$;
update public.market_quotes set status='accepted' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ declare denied boolean:=false;begin
 begin update public.market_quotes set status='accepted' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';exception when unique_violation then denied:=true;end;
 if not denied then raise exception 'FAIL: two selected quotes';end if;
end $$;
insert into public.market_quote_messages(quote_id,sender_id,body) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Anlaştık, iş kapsamını burada netleştirelim.');
update public.market_posts set status='closed' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ declare denied boolean:=false;begin
 begin update public.market_quotes set amount=11000 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: closed post quote edit';end if;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.market_posts set status='removed' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin if not exists(select 1 from public.market_posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL: removed post negotiation history';end if;end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.market_posts set status='closed' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role anon;
do $$ begin if not exists(select 1 from public.market_posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL: public post not visible';end if;end $$;
reset role;
rollback;
select 'PASS: ownership, quote privacy, private messages, self quotes, price integrity, single acceptance, closed posts, hidden profiles, public browsing; fixtures rolled back' as result;
