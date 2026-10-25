-- Rollback-only test for service requests and referrals.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','ref-inviter@example.invalid','{}'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','ref-invitee@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select set_config('request.jwt.claims','{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","app_metadata":{}}',true);
do $$declare c text;begin
 c:=public.my_referral_code();
 if c<>public.my_referral_code() then raise exception 'FAIL code not stable';end if;
 begin perform public.claim_referral(c);raise exception 'FAIL self referral';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 insert into public.service_requests(kind,note,city) values('finans','test','Ankara');
 begin insert into public.service_requests(kind,note,city) values('finans','dup','Ankara');raise exception 'FAIL duplicate request';exception when unique_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true);
select set_config('request.jwt.claims','{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","app_metadata":{}}',true);
do $$declare c text;begin
 if exists(select 1 from public.service_requests) then raise exception 'FAIL request leaked to other user';end if;
 reset role;select code into c from public.referral_codes where user_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';set local role authenticated;
 perform public.claim_referral(c);
 begin perform public.claim_referral(c);raise exception 'FAIL double claim';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 insert into public.listings(id,seller_id,kind,category,title,price,city,status) values('eeeeeeee-1111-4111-8111-eeeeeeeeeeee',auth.uid(),'machine','Ekskavatör','Ref fixture',1000,'Ankara','active');
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","app_metadata":{"role":"admin"}}',true);
update public.listings set moderation_status='approved' where id='eeeeeeee-1111-4111-8111-eeeeeeeeeeee';
do $$begin
 if not exists(select 1 from public.referrals where invitee_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and status='rewarded') then raise exception 'FAIL reward not granted';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select set_config('request.jwt.claims','{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","app_metadata":{}}',true);
do $$declare i int;begin
 for i in 1..4 loop insert into public.listings(seller_id,kind,category,title,price,city,status) values(auth.uid(),'machine','Ekskavatör','Limit '||i,1000,'Ankara','active');end loop;
 begin insert into public.listings(seller_id,kind,category,title,price,city,status) values(auth.uid(),'machine','Ekskavatör','Limit 5',1000,'Ankara','active');raise exception 'FAIL limit not enforced';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
rollback;
select 'PASS: service requests and referral rules; rolled back' result;
