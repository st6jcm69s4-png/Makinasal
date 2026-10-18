begin;
insert into auth.users(id,email,raw_user_meta_data) values
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','contact-seller@example.invalid','{}'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','contact-buyer@example.invalid','{}');
insert into public.listings(id,seller_id,kind,category,title,price,city,status,moderation_status) values
('dddddddd-1111-4111-8111-dddddddddddd','dddddddd-dddd-4ddd-8ddd-dddddddddddd','machine','Ekskavatör','Moderation visibility fixture',1000,'Ankara','active','pending');
insert into public.favorites(user_id,listing_id) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-1111-4111-8111-dddddddddddd');
set local role authenticated;
select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true);
do $$begin
 if has_function_privilege('anon','public.track_view(uuid)','EXECUTE') then raise exception 'FAIL anonymous view access';end if;
 if public.listing_phone('dddddddd-1111-4111-8111-dddddddddddd') is not null then raise exception 'FAIL pending phone disclosed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.listings set price=900 where id='dddddddd-1111-4111-8111-dddddddddddd';
do $$begin
 if exists(select 1 from public.listing_stats where listing_id='dddddddd-1111-4111-8111-dddddddddddd' and phones>0) then raise exception 'FAIL hidden phone counted';end if;
 if exists(select 1 from public.notifications where user_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') then raise exception 'FAIL pending price notification';end if;
end $$;
update public.listings set moderation_status='approved' where id='dddddddd-1111-4111-8111-dddddddddddd';
update public.listings set price=800 where id='dddddddd-1111-4111-8111-dddddddddddd';
do $$begin
 if not exists(select 1 from public.notifications where user_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and kind='price_drop') then raise exception 'FAIL approved price notification missing';end if;
end $$;
rollback;
select 'PASS: pending contact/price updates hidden, approved price notifications work; rolled back' result;
