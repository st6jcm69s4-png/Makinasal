begin;
insert into auth.users(id,email,raw_user_meta_data) values('77777777-7777-4777-8777-777777777777','brand-owner@example.invalid','{}'),('88888888-8888-4888-8888-888888888888','brand-other@example.invalid','{}');
insert into public.profiles(id,full_name) values('77777777-7777-4777-8777-777777777777','Brand owner'),('88888888-8888-4888-8888-888888888888','Brand other') on conflict(id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
insert into public.market_posts(owner_id,kind,title,description,category,city,price,rental_mode,brand,model) values(auth.uid(),'rental_machine','Test lastikli ekskavatör','Operatör dahil kiralama, gün ve kapsam görüşülecek.','Lastikli ekskavatör','Ankara',1000,'with_operator','Caterpillar','M315');
do $$ begin
 if (select count(*) from public.market_posts where owner_id=auth.uid() and brand ilike 'Caterpillar' and category in('Ekskavatör','Mini ekskavatör','Lastikli ekskavatör','Uzun bom ekskavatör','Amfibik ekskavatör'))<>1 then raise exception 'FAIL: grouped type and brand filter';end if;
end $$;
update public.market_posts set model='M316' where owner_id=auth.uid();
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$ declare n int;begin
 update public.market_posts set brand='Fake brand' where owner_id='77777777-7777-4777-8777-777777777777';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider brand edit';end if;
end $$;
set local role anon;
do $$ begin if not exists(select 1 from public.market_posts where owner_id='77777777-7777-4777-8777-777777777777' and brand='Caterpillar' and model='M316') then raise exception 'FAIL: public brand/model';end if;end $$;
reset role;
rollback;
select 'PASS: grouped-category brand/model query, owner update, outsider rejection and public read; fixtures rolled back' as result;
