begin;
insert into auth.users(id,email,raw_user_meta_data) values('77777777-7777-4777-8777-777777777777','brand-owner@example.invalid','{}'),('88888888-8888-4888-8888-888888888888','brand-other@example.invalid','{}');
insert into public.profiles(id,full_name) values('77777777-7777-4777-8777-777777777777','Brand owner'),('88888888-8888-4888-8888-888888888888','Brand other') on conflict(id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
insert into public.market_posts(owner_id,kind,title,description,category,city,price,personnel_role) values
(auth.uid(),'rental_operator','Test ekskavatör operatörü','Test personel ilanı; kayıtlar geri alınacak.','Ekskavatör','Ankara',1000,'operator'),
(auth.uid(),'rental_operator','Test kamyon ustası','Test personel ilanı; kayıtlar geri alınacak.','Damperli kamyon','Ankara',1500,'mechanic'),
(auth.uid(),'rental_operator','Test eski personel ilanı','Test personel ilanı; kayıtlar geri alınacak.','Damperli kamyon','Ankara',1500,null);
do $$ begin
 if (select count(*) from public.market_posts where owner_id=auth.uid() and personnel_role='mechanic' and category='Damperli kamyon')<>1 then raise exception 'FAIL: mechanic filter';end if;
 if (select count(*) from public.market_posts where owner_id=auth.uid())<>3 then raise exception 'FAIL: legacy role-null visibility';end if;
 begin
  update public.market_posts set personnel_role='invalid' where owner_id=auth.uid();
  raise exception 'FAIL: invalid role accepted';
 exception when check_violation then null;end;
end $$;
update public.market_posts set personnel_role='driver' where owner_id=auth.uid() and personnel_role='mechanic';
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$ declare n int;begin
 update public.market_posts set personnel_role='mechanic' where owner_id='77777777-7777-4777-8777-777777777777';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider role edit';end if;
end $$;
set local role anon;
do $$ begin if (select count(*) from public.market_posts where owner_id='77777777-7777-4777-8777-777777777777' and personnel_role='driver')<>1 then raise exception 'FAIL: public role read';end if;end $$;
reset role;
rollback;
select 'PASS: personnel filters, legacy listings, validation, owner update, outsider rejection and public read; fixtures rolled back' as result;
