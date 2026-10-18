begin;
do $$declare word text;begin
 foreach word in array array['AMK','a.m.k','a m k','amına koyayım','amınakoyim','SİKTİR','s i k t i r','siktirin','şerefsiz','pezevenk','gerizekalı','f.u.c.k','sh1t','f@ggot',U&'fu\200bck'] loop
  if not makinasal_moderation.contains_profanity(word) then raise exception 'FAIL: abusive variant accepted: %',word;end if;
 end loop;
 foreach word in array array['sık görüşelim','sıkıştırma makinesi','sıkıntı yok','Scunthorpe','class','I got the spare parts','piston','şikayet','Yarın pompayı görebilir miyim?','Cumartesi müsaitim','Amina ile görüşelim'] loop
  if makinasal_moderation.contains_profanity(word) then raise exception 'FAIL: harmless message blocked: %',word;end if;
 end loop;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777777','profanity-owner@example.invalid','{}'),
('88888888-8888-4888-8888-888888888888','profanity-buyer@example.invalid','{}');
insert into public.listings(id,seller_id,kind,category,title,price,city) values
('77777777-1111-4111-8111-777777777777','77777777-7777-4777-8777-777777777777','machine','Ekskavatör','Profanity test',100,'Ankara');
insert into public.threads(id,listing_id,buyer_id,seller_id) values
('77777777-2222-4222-8222-777777777777','77777777-1111-4111-8111-777777777777','88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777');
insert into public.market_posts(id,owner_id,kind,title,description,category,city) values
('77777777-4444-4444-8444-777777777777','77777777-7777-4777-8777-777777777777','job','Test machinery job','A sufficiently long description for this test.','Ekskavatör','Ankara');
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
insert into public.market_quotes(id,post_id,owner_id,bidder_id,display_name,amount,price_unit,note) values
('77777777-5555-4555-8555-777777777777','77777777-4444-4444-8444-777777777777','77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','Test company',100,'toplam','Scope and delivery included.');
set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$begin
 begin insert into public.messages(thread_id,sender_id,body) values('77777777-2222-4222-8222-777777777777',auth.uid(),'a.m.k');raise exception 'FAIL: direct message bypass';exception when check_violation then if sqlerrm not like 'MESSAGE_PROFANITY:%' then raise;end if;end;
 begin insert into public.market_quote_messages(quote_id,sender_id,body) values('77777777-5555-4555-8555-777777777777',auth.uid(),'f.u.c.k');raise exception 'FAIL: direct quote message bypass';exception when check_violation then if sqlerrm not like 'MESSAGE_PROFANITY:%' then raise;end if;end;
 insert into public.messages(thread_id,sender_id,body) values('77777777-2222-4222-8222-777777777777',auth.uid(),'Yarın pompayı görebilir miyim?');
 insert into public.market_quote_messages(quote_id,sender_id,body) values('77777777-5555-4555-8555-777777777777',auth.uid(),'I got the spare parts.');
end $$;
reset role;
-- Updates are guarded too, even for a privileged client; historical messages are not changed.
do $$begin
 begin update public.messages set body='SİKTİR' where thread_id='77777777-2222-4222-8222-777777777777';raise exception 'FAIL: update bypass';exception when check_violation then null;end;
 if has_schema_privilege('authenticated','makinasal_moderation','usage') or has_function_privilege('authenticated','makinasal_moderation.guard_message()','execute') then raise exception 'FAIL: exposed privileged trigger';end if;
end $$;
rollback;
select 'PASS: TR/EN abuse variants rejected, harmless messages accepted, both message tables guarded against direct client bypass and update; fixtures rolled back' as result;
