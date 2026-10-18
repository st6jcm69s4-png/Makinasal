-- Run only on a local/staging clone after BOTH pending migrations are installed.
-- This has not been executed against production: production DDL approval is pending.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','moderation-seller@example.invalid','{}'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','moderation-other@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","app_metadata":{},"user_metadata":{"role":"admin"}}',true);
insert into public.listings(id,seller_id,kind,category,title,price,city,status,moderation_status)
values('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',auth.uid(),'machine','Ekskavatör','Moderation fixture',1000,'Ankara','active','approved');
do $$begin
 if public.is_moderator() then raise exception 'FAIL user_metadata admin escalation';end if;
 if not exists(select 1 from public.listings where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb' and moderation_status='pending') then raise exception 'FAIL owner bypass';end if;
 update public.listings set moderation_status='approved' where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
 if not exists(select 1 from public.listings where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb' and moderation_status='pending') then raise exception 'FAIL owner self-approval';end if;
end $$;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","app_metadata":{}}',true);
do $$begin
 if exists(select 1 from public.listings where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb') then raise exception 'FAIL pending visible to outsider';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","app_metadata":{"role":"admin"}}',true);
update public.listings set moderation_status='approved' where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$begin
 if not exists(select 1 from public.listings where id='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb') then raise exception 'FAIL approved hidden';end if;
 if not exists(select 1 from public.user_stats where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'FAIL invoker summary unavailable';end if;
end $$;
reset role;
do $$declare i int;begin
 for i in 1..3 loop perform makinasal_private.take_limit('integration-fixture',3,60);end loop;
 if makinasal_private.take_limit('integration-fixture',3,60) then raise exception 'FAIL rate counter';end if;
 if has_schema_privilege('authenticated','makinasal_private','usage') then raise exception 'FAIL exposed private schema';end if;
end $$;
rollback;
