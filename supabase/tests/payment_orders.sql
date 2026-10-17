begin;
insert into auth.users(id,email,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777777','pay-buyer@example.invalid','{"full_name":"Buyer"}'),
('88888888-8888-4888-8888-888888888888','pay-seller@example.invalid','{"full_name":"Seller"}'),
('99999999-9999-4999-8999-999999999999','pay-other@example.invalid','{"full_name":"Other"}');
insert into public.payment_merchants(user_id,sub_merchant_key,approved) values('88888888-8888-4888-8888-888888888888','test-no-real-merchant',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
insert into public.market_posts(id,owner_id,kind,title,description,category,city) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'job','Test ödeme işi','Test işlemidir, kayıtlar geri alınır.','Kamyon','Ankara');
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
insert into public.market_quotes(id,post_id,owner_id,bidder_id,display_name,amount,price_unit,note) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777',auth.uid(),'Seller',125.55,'toplam','Test toplam bedel');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
update public.market_quotes set status='accepted' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
set local role service_role;
do $$declare o public.payment_orders;o2 public.payment_orders;begin
 select * into o from public.prepare_payment_order('77777777-7777-4777-8777-777777777777','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 if o.amount_minor<>12555 then raise exception 'FAIL: server-side amount';end if;
 select * into o2 from public.prepare_payment_order('77777777-7777-4777-8777-777777777777','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 if o.id<>o2.id then raise exception 'FAIL: idempotent order';end if;
 begin perform public.prepare_payment_order('77777777-7777-4777-8777-777777777777','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd');raise exception 'FAIL: duplicate active quote';exception when raise_exception then if sqlerrm='FAIL: duplicate active quote' then raise;end if;end;
 begin perform public.record_payment_result(o.id,1,'TRY','paid','test-payment','test-transaction','bad-amount');raise exception 'FAIL: altered amount accepted';exception when raise_exception then if sqlerrm='FAIL: altered amount accepted' then raise;end if;end;
 perform public.record_payment_result(o.id,12555,'TRY','review','test-payment','test-transaction','event-review');
 perform public.record_payment_result(o.id,12555,'TRY','paid','test-payment','test-transaction','event-paid');
 perform public.record_payment_result(o.id,12555,'TRY','paid','test-payment','test-transaction','event-paid');
 if (select count(event_key) from public.payment_events where order_id=o.id)<>2 then raise exception 'FAIL: event replay';end if;
 perform public.record_payment_result(o.id,12555,'TRY','failed','test-payment','test-transaction','event-late-failure');
 if (select status from public.payment_orders where id=o.id)<>'paid' then raise exception 'FAIL: terminal payment downgraded';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
do $$begin
 if (select count(id) from public.payment_orders where quote_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>1 then raise exception 'FAIL: buyer visibility';end if;
 if has_function_privilege('authenticated','public.record_payment_result(uuid,bigint,text,text,text,text,text)','execute') then raise exception 'FAIL: client can mark paid';end if;
 if has_column_privilege('authenticated','public.payment_orders','provider_token','select') then raise exception 'FAIL: token exposed';end if;
 if has_table_privilege('authenticated','public.payment_merchants','select') then raise exception 'FAIL: merchant secrets exposed';end if;
 begin update public.payment_orders set status='paid';raise exception 'FAIL: client payment update';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$begin if (select count(id) from public.payment_orders)<>0 then raise exception 'FAIL: third party payment read';end if;end $$;
reset role;
rollback;
select 'PASS: database amount, idempotency, duplicate payment prevention, verified-state transitions, private provider tokens and participant isolation; fixtures rolled back' as result;
