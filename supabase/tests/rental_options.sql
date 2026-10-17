begin;
insert into auth.users(id,email,raw_user_meta_data) values('66666666-6666-4666-8666-666666666666','rental-test@example.invalid','{}');
insert into public.profiles(id,full_name) values('66666666-6666-4666-8666-666666666666','Rental test') on conflict(id) do nothing;
-- Legacy unknown record remains unknown; no operator assumption/backfill.
insert into public.market_posts(owner_id,kind,title,description,category,city,price) values('66666666-6666-4666-8666-666666666666','rental_machine','Eski kiralık ilanı','Önceki sürümden kapsamı belirtilmemiş kiralık makine.','Ekskavatör','Ankara',1000);
set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
do $$ declare denied boolean:=false;begin
 begin insert into public.market_posts(owner_id,kind,title,description,category,city,price) values(auth.uid(),'rental_machine','Eksik kapsam testi','Yeni ilanda operatör durumu boş bırakılamaz.','Kamyon','Ankara',1000);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: new rental scope missing';end if;
 denied:=false;begin insert into public.market_posts(owner_id,kind,title,description,category,city,price,rental_mode) values(auth.uid(),'rental_machine','Geçersiz kapsam testi','Geçersiz değer ile kiralama kapsamı denemesi.','Kamyon','Ankara',1000,'invalid');exception when check_violation then denied:=true;end;
 if not denied then raise exception 'FAIL: invalid rental mode';end if;
end $$;
insert into public.market_posts(owner_id,kind,title,description,category,city,price,rental_mode) values
 (auth.uid(),'rental_machine','Operatörlü Manitou kiralama','Operatör dahil, yakıt ve nakliye ayrıca görüşülür.','Manitou / teleskopik yükleyici','Ankara',5000,'with_operator'),
 (auth.uid(),'rental_machine','Operatörsüz mobil vinç kiralama','Sadece mobil vinç kiralama, operatör dahil değildir.','Mobil vinç','Ankara',4000,'machine_only');
do $$ begin
 if (select count(*) from public.market_posts where owner_id=auth.uid() and city='Ankara' and rental_mode='with_operator')<>1 then raise exception 'FAIL: with operator filter';end if;
 if (select count(*) from public.market_posts where owner_id=auth.uid() and rental_mode='machine_only')<>1 then raise exception 'FAIL: machine only filter';end if;
end $$;
update public.market_posts set status='closed' where owner_id=auth.uid() and rental_mode is null;
do $$ begin if not exists(select 1 from public.market_posts where owner_id=auth.uid() and rental_mode is null and status='closed') then raise exception 'FAIL: legacy closure';end if;end $$;
set local role anon;
do $$ begin if (select count(*) from public.market_posts where owner_id='66666666-6666-4666-8666-666666666666' and status='open' and rental_mode in('with_operator','machine_only'))<>2 then raise exception 'FAIL: public rental modes';end if;end $$;
reset role;
rollback;
select 'PASS: explicit rental scope required, valid modes filterable, new machine categories, public browsing and legacy closure; fixtures rolled back' as result;
