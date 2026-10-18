begin;
insert into auth.users(id,email,raw_user_meta_data) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','rl-seller@example.invalid','{"full_name":"RL Seller"}'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','rl-buyer@example.invalid','{"full_name":"RL Buyer"}');
insert into public.listings(id,seller_id,kind,category,title,price,city) values
('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','machine','Ekskavatör','RL test',1000,'Ankara');
insert into public.threads(id,listing_id,buyer_id,seller_id) values
('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.favorites(user_id,listing_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select set_config('request.uid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
do $$declare n int; blocked boolean:=false; begin
  for i in 1..30 loop insert into public.messages(thread_id,sender_id,body) values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Merhaba '||i); end loop;
  begin insert into public.messages(thread_id,sender_id,body) values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','31');
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'FAIL: 31st message not rate limited'; end if;
  for i in 1..5 loop perform public.track_view('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'); end loop;

end $$;
reset role;
do $$declare n int; begin
  select views into n from public.listing_stats where listing_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  if n is distinct from 1 then raise exception 'FAIL: views should be capped at 1, got %', n;end if;
  select count(*) into n from public.notifications where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind='message';
  if n<>30 then raise exception 'FAIL: seller should get 30 message notifications, got %', n; end if;
  update public.listings set price=900 where id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  if not exists(select 1 from public.notifications where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and kind='price_drop') then raise exception 'FAIL: price drop notification missing'; end if;
  if (public.run_maintenance()->>'orphan_photos')::int<>0 then raise exception 'FAIL: maintenance must not delete storage metadata';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('request.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
do $$begin
  if (select count(*) from public.notifications where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>0 then raise exception 'FAIL: user sees another user''s notifications'; end if;
  begin perform public.run_maintenance(); raise exception 'FAIL: run_maintenance callable by users'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'RL_NOTIF_TESTS_OK';
