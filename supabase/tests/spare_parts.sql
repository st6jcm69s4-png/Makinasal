begin;
insert into auth.users(id,email,raw_user_meta_data) values('77777777-7777-4777-8777-777777777777','parts-owner@example.invalid','{"full_name":"Parts owner"}'),('88888888-8888-4888-8888-888888888888','parts-other@example.invalid','{"full_name":"Parts other"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
insert into public.listings(seller_id,kind,category,title,price,city,equipment_category,part_group) values
(auth.uid(),'part','Yedek parça','Ekskavatör pompası',100,'Ankara','Ekskavatör','hydraulics'),
(auth.uid(),'part','Yedek parça','Kamyon filtresi',50,'İstanbul','Damperli kamyon','filters'),
(auth.uid(),'part','Yedek parça','Eski parça kaydı',50,'Ankara',null,null);
do $$begin
 if (select count(id) from public.listings where seller_id=auth.uid() and equipment_category='Ekskavatör' and part_group='hydraulics')<>1 then raise exception 'FAIL: equipment + part filter';end if;
 if (select count(id) from public.listings where seller_id=auth.uid() and category='Yedek parça')<>3 then raise exception 'FAIL: legacy parts missing from all results';end if;
 begin update public.listings set part_group='invalid' where seller_id=auth.uid();raise exception 'FAIL: invalid part group';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$declare n int;begin update public.listings set part_group='other' where seller_id='77777777-7777-4777-8777-777777777777';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider part classification change';end if;end $$;
set local role anon;
do $$begin if (select count(id) from public.listings where seller_id='77777777-7777-4777-8777-777777777777' and equipment_category='Ekskavatör')<>1 then raise exception 'FAIL: public classified parts';end if;end $$;
reset role;
rollback;
select 'PASS: equipment/part filters, legacy visibility, classification constraints and owner isolation; fixtures rolled back' as result;
