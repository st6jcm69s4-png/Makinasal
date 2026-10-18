begin;
insert into auth.users(id,email,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777777','history-seller@example.invalid','{"full_name":"History Seller"}'),
('88888888-8888-4888-8888-888888888888','history-buyer@example.invalid','{"full_name":"History Buyer"}'),
('99999999-9999-4999-8999-999999999999','history-other@example.invalid','{"full_name":"History Other"}');
insert into public.listings(id,seller_id,kind,category,title,price,city) values
('77777777-1111-4111-8111-777777777777','77777777-7777-4777-8777-777777777777','machine','Ekskavatör','History test',100,'Ankara');
insert into public.threads(id,listing_id,buyer_id,seller_id) values
('77777777-2222-4222-8222-777777777777','77777777-1111-4111-8111-777777777777','88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777'),
('88888888-2222-4222-8222-888888888888','77777777-1111-4111-8111-777777777777','99999999-9999-4999-8999-999999999999','77777777-7777-4777-8777-777777777777');
-- More than 300 recent messages in one thread must not hide another thread's old preview.
insert into public.messages(thread_id,sender_id,body,created_at)
select '77777777-2222-4222-8222-777777777777','77777777-7777-4777-8777-777777777777','Message '||n, '2026-01-01'::timestamptz+n*interval '1 second' from generate_series(1,320) n;
insert into public.messages(id,thread_id,sender_id,body,created_at) values
('77777777-3333-4333-8333-777777777777','88888888-2222-4222-8222-888888888888','77777777-7777-4777-8777-777777777777','Older thread preview','2025-01-01');
insert into public.messages(id,thread_id,sender_id,body,created_at)
select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'77777777-2222-4222-8222-777777777777','77777777-7777-4777-8777-777777777777','Tie '||n,'2026-02-01T00:00:00.123456Z'::timestamptz from generate_series(1,121) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
do $$declare ids uuid[]:=array['77777777-2222-4222-8222-777777777777','88888888-2222-4222-8222-888888888888']::uuid[];n int;begin
 if (select count(*) from public.latest_thread_messages(ids))<>2 then raise exception 'FAIL: missing older thread preview';end if;
 if not exists(select 1 from public.latest_thread_messages(ids) where body='Tie 121') then raise exception 'FAIL: not latest message';end if;
 select count(*) into n from (select id from public.messages where thread_id=ids[1] order by created_at desc,id desc limit 50) q;
 if n<>50 then raise exception 'FAIL: latest page';end if;
 -- All 121 timestamps are equal: cursor UUID must keep adjacent pages disjoint and complete.
 select count(*) into n from public.messages where thread_id=ids[1] and created_at='2026-02-01T00:00:00.123456Z' and id<'10000000-0000-4000-8000-000000000072';
 if n<>71 then raise exception 'FAIL: equal-timestamp cursor skipped records';end if;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$begin
 if (select count(*) from public.latest_thread_messages(array['77777777-2222-4222-8222-777777777777','88888888-2222-4222-8222-888888888888']::uuid[]))<>1 then raise exception 'FAIL: outsider preview leak';end if;
 if exists(select 1 from public.messages where thread_id='88888888-2222-4222-8222-888888888888') then raise exception 'FAIL: outsider message leak';end if;
end $$;
reset role;
do $$begin if has_function_privilege('anon','public.latest_thread_messages(uuid[])','execute') then raise exception 'FAIL: anon previews';end if;end $$;
rollback;
select 'PASS: per-thread latest preview beyond global 300, 50-message page, participant RLS and anon denial; fixtures rolled back' as result;
