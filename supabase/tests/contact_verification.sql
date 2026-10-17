begin;
insert into auth.users(id,email,phone,phone_confirmed_at,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777777','unverified@example.invalid',null,null,'{"full_name":"Unverified","verified_phone":true}'),
('88888888-8888-4888-8888-888888888888','verified@example.invalid','905550000001',now(),'{"full_name":"Verified"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
select public.sync_contact_verification();
do $$begin
 if (select verified_phone from public.profiles where id=auth.uid()) then raise exception 'FAIL: metadata trusted';end if;
 begin update public.profiles set verified_phone=true where id=auth.uid();raise exception 'FAIL: forged phone flag';exception when raise_exception then if sqlerrm='FAIL: forged phone flag' then raise;end if;end;
 begin update public.profiles set is_premium=true where id=auth.uid();raise exception 'FAIL: forged premium';exception when raise_exception then if sqlerrm='FAIL: forged premium' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
select public.sync_contact_verification();
do $$begin
 if not exists(select 1 from public.profiles where id=auth.uid() and verified_phone) or public.my_phone()<>'905550000001' then raise exception 'FAIL: confirmed phone sync';end if;
 if (select verified_phone from public.profiles where id='77777777-7777-4777-8777-777777777777') then raise exception 'FAIL: cross-account verification';end if;
end $$;
update public.profiles set phone='905550000002' where id=auth.uid();
do $$begin if (select verified_phone from public.profiles where id=auth.uid()) then raise exception 'FAIL: changed phone remains verified';end if;end $$;
reset role;
do $$begin if has_function_privilege('anon','public.sync_contact_verification()','execute') then raise exception 'FAIL: anonymous sync';end if;end $$;
rollback;
select 'PASS: verified Auth phone only, own-account sync, spoofed flags rejected, changed phone clears verification and anonymous access denied; fixtures rolled back' as result;
