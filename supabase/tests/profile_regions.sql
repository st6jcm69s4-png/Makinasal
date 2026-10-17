begin;
insert into auth.users(id,email,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777777','profile-owner@example.invalid','{"full_name":"Alperen Eker","city":"Ankara","district":"Sincan"}'),
('88888888-8888-4888-8888-888888888888','profile-skipped@example.invalid','{"full_name":"Bölge Atlandı"}'),
('99999999-9999-4999-8999-999999999999','profile-invalid@example.invalid','{"full_name":"Geçersiz Bölge","city":"Ankara","district":"Kadıköy"}');
do $$ begin
 if not exists(select 1 from public.profiles where id='77777777-7777-4777-8777-777777777777' and city='Ankara' and district='Sincan') then raise exception 'FAIL: signup region not persisted';end if;
 if exists(select 1 from public.profiles where id in('88888888-8888-4888-8888-888888888888','99999999-9999-4999-8999-999999999999') and (coalesce(city,'')<>'' or district<>'')) then raise exception 'FAIL: skipped or mismatched signup region';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
update public.profiles set bio='Ekskavatör operatörüyüm.',company_bio='Ankara çevresinde hafriyat ve nakliye.',city='Samsun',district='Çarşamba' where id=auth.uid();
do $$ begin
 if not exists(select 1 from public.profiles where id=auth.uid() and district='Çarşamba' and bio='Ekskavatör operatörüyüm.') then raise exception 'FAIL: profile update';end if;
 begin
  update public.profiles set district='Kadıköy' where id=auth.uid();raise exception 'FAIL: wrong district accepted';
 exception when check_violation then null;end;
 begin
  update public.profiles set bio=repeat('x',501) where id=auth.uid();raise exception 'FAIL: long bio accepted';
 exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$ declare n int;begin
 update public.profiles set bio='Unauthorized' where id='77777777-7777-4777-8777-777777777777';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider profile edit';end if;
end $$;
set local role anon;
do $$ begin
 if not exists(select 1 from public.profiles where id='77777777-7777-4777-8777-777777777777' and company_bio='Ankara çevresinde hafriyat ve nakliye.') then raise exception 'FAIL: public biography';end if;
end $$;
reset role;
rollback;
select 'PASS: signup region persistence, optional skip, invalid pair rejection, profile bios, owner update and public display; fixtures rolled back' as result;
