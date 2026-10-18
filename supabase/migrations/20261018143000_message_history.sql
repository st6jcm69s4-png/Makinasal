-- One preview per conversation; never truncate previews using a global message limit.
-- SECURITY INVOKER keeps the existing messages/threads participant RLS in force.
create index if not exists messages_thread_history_idx
  on public.messages(thread_id,created_at desc,id desc);
create or replace function public.latest_thread_messages(p_threads uuid[])
returns table(thread_id uuid,body text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $$
  select t.id,m.body,m.created_at
  from public.threads t
  cross join lateral (
    select x.body,x.created_at from public.messages x
    where x.thread_id=t.id
    order by x.created_at desc,x.id desc limit 1
  ) m
  where t.id=any(p_threads) and (select auth.uid()) in(t.buyer_id,t.seller_id);
$$;
revoke all on function public.latest_thread_messages(uuid[]) from public,anon;
grant execute on function public.latest_thread_messages(uuid[]) to authenticated;
