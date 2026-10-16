-- Isolated fixtures; no email delivery, all changes rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('44444444-4444-4444-8444-444444444444','inventory-owner@example.invalid','{}'),
 ('55555555-5555-4555-8555-555555555555','inventory-other@example.invalid','{}');
insert into public.profiles(id,full_name) values('44444444-4444-4444-8444-444444444444','Inventory owner'),('55555555-5555-4555-8555-555555555555','Other') on conflict(id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
insert into public.service_providers(user_id,name,kind,company_category,description,city,service_cities,specialties,published) values('44444444-4444-4444-8444-444444444444','Test excavation','excavation','Hafriyat şirketi','Kazı ve nakliye hizmetleri sunan test şirketi.','Ankara',array['Ankara','Samsun'],array['Hafriyat'],true);
insert into public.company_inventory(owner_id,category,brand,model,quantity,capacity,availability,published) values
 ('44444444-4444-4444-8444-444444444444','Ekskavatör','SANY','SY215C',3,'22 ton','available',true),
 ('44444444-4444-4444-8444-444444444444','Kamyon','Test','Gizli kamyon',2,'30 ton','busy',false);
do $$ declare denied boolean:=false;begin
 if (select sum(quantity) from public.company_inventory where owner_id=auth.uid())<>5 then raise exception 'FAIL: owner inventory total';end if;
 begin insert into public.company_inventory(owner_id,category,model,quantity) values(auth.uid(),'Kamyon','Invalid quantity',0);exception when check_violation then denied:=true;end;
 if not denied then raise exception 'FAIL: invalid quantity allowed';end if;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.company_inventory where owner_id='44444444-4444-4444-8444-444444444444')<>1 then raise exception 'FAIL: public inventory privacy';end if;
 if not exists(select 1 from public.service_providers where company_category='Hafriyat şirketi' and user_id='44444444-4444-4444-8444-444444444444' and service_cities @>array['Samsun']) then raise exception 'FAIL: company category or service area';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
do $$ declare denied boolean:=false;n int;begin
 update public.company_inventory set quantity=100 where owner_id='44444444-4444-4444-8444-444444444444';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider edit';end if;
 delete from public.company_inventory where owner_id='44444444-4444-4444-8444-444444444444';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider delete';end if;
 begin insert into public.company_inventory(owner_id,category,model) values('44444444-4444-4444-8444-444444444444','Kamyon','Forged owner');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: forged inventory owner';end if;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
update public.company_inventory set quantity=4,availability='maintenance' where owner_id=auth.uid() and model='SY215C';
update public.service_providers set published=false where user_id=auth.uid();
set local role anon;
do $$ begin if exists(select 1 from public.company_inventory where owner_id='44444444-4444-4444-8444-444444444444') then raise exception 'FAIL: hidden company leaks inventory';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ begin if (select sum(quantity) from public.company_inventory where owner_id=auth.uid())<>6 then raise exception 'FAIL: owner hidden inventory access';end if;end $$;
delete from public.company_inventory where owner_id=auth.uid();
do $$ begin if exists(select 1 from public.company_inventory where owner_id=auth.uid()) then raise exception 'FAIL: owner delete';end if;end $$;
reset role;
rollback;
select 'PASS: company classification, service areas, quantities, owner CRUD, outsider write rejection, hidden equipment and hidden company inventory privacy; fixtures rolled back' as result;
