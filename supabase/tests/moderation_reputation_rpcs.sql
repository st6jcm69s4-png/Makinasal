-- Run against a disposable database after the migrations. All fixtures roll back.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001', 'rpc-seller@example.invalid', '{}'),
 ('10000000-0000-4000-8000-000000000002', 'rpc-buyer@example.invalid', '{}'),
 ('10000000-0000-4000-8000-000000000003', 'rpc-outsider@example.invalid', '{}');
update public.profiles set phone = case when id = '10000000-0000-4000-8000-000000000001'
  then '905550000101' else '905550000102' end
where id in ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

insert into public.listings(id, seller_id, kind, category, title, price, city, status, moderation_status) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'machine', 'Ekskavatör', 'Approved fixture', 1000, 'Ankara', 'active', 'approved'),
 ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'machine', 'Ekskavatör', 'Pending fixture', 1000, 'Ankara', 'active', 'pending'),
 ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'machine', 'Ekskavatör', 'Other approved fixture', 1000, 'Ankara', 'active', 'approved'),
 ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'machine', 'Ekskavatör', 'Buyer listing fixture', 1000, 'Ankara', 'active', 'approved');

insert into public.threads(id, listing_id, buyer_id, seller_id, buyer_read_at, seller_read_at) values
 ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', now()-interval '1 hour', now()-interval '1 hour'),
 ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', now()-interval '1 hour', now()-interval '1 hour');

insert into public.messages(thread_id, sender_id, body, created_at) values
 ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Test mesajı', now()-interval '1 minute'),
 ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Test yanıtı', now()-interval '30 seconds');

set local role anon;
do $$
begin
  if has_function_privilege('anon','public.listing_phone(uuid)','EXECUTE')
    or has_function_privilege('anon','public.my_phone()','EXECUTE')
    or has_function_privilege('anon','public.track_view(uuid)','EXECUTE')
    or has_function_privilege('anon','public.mark_thread_read(uuid)','EXECUTE') then
    raise exception 'Anonymous role can execute a restricted RPC';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select public.mark_thread_read('30000000-0000-4000-8000-000000000001');
do $$begin
  if public.my_phone() is not null or has_column_privilege('authenticated','public.profiles','phone','select') then
    raise exception 'Outsider can read a private profile phone';
  end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"app_metadata":{"role":"admin"}}',true);
do $$begin
  if not public.is_moderator() then raise exception 'Fixture needs moderator visibility'; end if;
  begin
    insert into public.threads(listing_id,buyer_id,seller_id)
    values ('20000000-0000-4000-8000-000000000002',auth.uid(),'10000000-0000-4000-8000-000000000001');
    raise exception 'Moderator opened a buyer thread on a pending listing';
  exception when insufficient_privilege then null;
  end;
  if has_column_privilege('authenticated','public.reports','reason','update')
     or not has_column_privilege('authenticated','public.reports','verified','update') then
    raise exception 'Report update grants are incorrect';
  end if;
end $$;
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
do $$begin
  begin
    perform public.listing_phone('20000000-0000-4000-8000-000000000001');
    raise exception 'Anonymous auth account disclosed a phone';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims','{}',true);

do $$
declare
  listing constant uuid := '20000000-0000-4000-8000-000000000001';
  pending constant uuid := '20000000-0000-4000-8000-000000000002';
  thread constant uuid := '30000000-0000-4000-8000-000000000001';
  receipt_row tid;
begin
  if public.my_phone() is distinct from '905550000102' or public.listing_phone(pending) is not null then
    raise exception 'Own or pending phone access is incorrect';
  end if;
  if not exists(select 1 from public.threads where id=thread
    and buyer_read_at=now()-interval '1 hour' and seller_read_at=now()-interval '1 hour') then
    raise exception 'Outsider changed a read receipt';
  end if;
  perform public.mark_thread_read(thread);
  select ctid into receipt_row from public.threads where id=thread
    and buyer_read_at=now()-interval '1 minute' and seller_read_at=now()-interval '1 hour';
  if not found then raise exception 'Buyer did not advance only their own receipt'; end if;
  perform public.mark_thread_read(thread);
  if not exists(select 1 from public.threads where id=thread and ctid=receipt_row) then
    raise exception 'Repeated read rewrote the thread';
  end if;

  for i in 1..20 loop
    if public.listing_phone(listing) is distinct from '905550000101' then
      raise exception 'Approved phone unavailable before quota';
    end if;
  end loop;
  begin
    perform public.listing_phone('20000000-0000-4000-8000-000000000003');
    raise exception 'Phone quota was bypassed by changing the listing';
  exception when sqlstate 'PT429' then null;
  end;

  perform public.track_view(pending);
  perform public.track_view('20000000-0000-4000-8000-000000000004');
  for i in 1..120 loop perform public.track_view(listing); end loop;
  perform public.track_view('20000000-0000-4000-8000-000000000003');
end $$;

insert into public.deals(thread_id,buyer_confirmed) values ('30000000-0000-4000-8000-000000000001',true);
update public.deals set thread_id='30000000-0000-4000-8000-000000000002', seller_confirmed=true
where thread_id='30000000-0000-4000-8000-000000000001';
do $$begin
  if not exists(select 1 from public.deals where thread_id='30000000-0000-4000-8000-000000000001'
    and buyer_confirmed and not seller_confirmed and completed_at is null) then
    raise exception 'Changing the proposed thread key bypassed the other party approval';
  end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.mark_thread_read('30000000-0000-4000-8000-000000000001');
do $$begin
  if not exists(select 1 from public.threads where id='30000000-0000-4000-8000-000000000001'
    and buyer_read_at=now()-interval '1 minute' and seller_read_at=now()-interval '30 seconds') then
    raise exception 'Seller did not advance only their own receipt';
  end if;
end $$;
update public.deals set seller_confirmed=true where thread_id='30000000-0000-4000-8000-000000000001';

reset role;
select set_config('request.jwt.claim.sub','',true);
insert into public.reports(id,reporter_id,listing_id,reason)
values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001','Test report');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"app_metadata":{"role":"admin"}}',true);
update public.reports set verified=true,status='resolved' where id='40000000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$begin
  if not exists(select 1 from public.listing_stats where listing_id='20000000-0000-4000-8000-000000000001'
    and views=1 and phones=1) or (select count(*) from public.listing_stats where listing_id::text like '20000000-%') <> 1 then
    raise exception 'Duplicate, own, pending or over-quota traffic affected listing counts';
  end if;
end $$;

-- Skip waiting a day while exercising the next request at the actual quota.
update makinasal_private.request_buckets set started_at=clock_timestamp()-interval '2 minutes'
where key='phone-minute:10000000-0000-4000-8000-000000000002';
update makinasal_private.request_buckets set hits=100
where key='phone-day:10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
  begin
    perform public.listing_phone('20000000-0000-4000-8000-000000000003');
    raise exception 'Daily phone quota did not block after minute reset';
  exception when sqlstate 'PT429' then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin
  if exists(select 1 from public.deals where thread_id='30000000-0000-4000-8000-000000000001')
     or exists(select 1 from public.reports where id='40000000-0000-4000-8000-000000000001') then
    raise exception 'Outsider can read an underlying private deal or report';
  end if;
  if not exists(select 1 from public.user_stats where id='10000000-0000-4000-8000-000000000001'
    and deals=1 and reports=1) then
    raise exception 'Outsider reputation aggregate is incorrect';
  end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
  if has_table_privilege('anon','public.user_stats_summary','update')
     or not exists(select 1 from public.user_stats where id='10000000-0000-4000-8000-000000000001'
       and deals=1 and reports=1) then
    raise exception 'Guest reputation aggregate or grant is incorrect';
  end if;
end $$;
rollback;
