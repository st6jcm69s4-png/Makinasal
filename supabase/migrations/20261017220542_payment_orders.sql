-- Merchant onboarding and provider keys are server-only. No card or identity data is stored here.
create table public.payment_merchants(user_id uuid primary key references public.profiles(id),sub_merchant_key text not null,approved boolean not null default false,updated_at timestamptz not null default now());
alter table public.payment_merchants enable row level security;
revoke all on public.payment_merchants from public,anon,authenticated;
grant all on public.payment_merchants to service_role;
create table public.payment_orders(
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.market_quotes(id),buyer_id uuid not null references public.profiles(id),seller_id uuid not null references public.profiles(id),request_key uuid not null,
 title text not null,amount_minor bigint not null check(amount_minor>0),currency text not null default 'TRY' check(currency='TRY'),status text not null default 'initializing' check(status in('initializing','pending','review','paid','failed')),
 provider_token text unique,provider_checkout_url text,provider_payment_id text unique,provider_transaction_id text unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(buyer_id,request_key),check(buyer_id<>seller_id)
);
create unique index payment_quote_active on public.payment_orders(quote_id) where status in('initializing','pending','review','paid');
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from public,anon,authenticated;
grant select(id,quote_id,buyer_id,seller_id,title,amount_minor,currency,status,created_at,updated_at) on public.payment_orders to authenticated;
grant all on public.payment_orders to service_role;
create policy payment_orders_participants on public.payment_orders for select to authenticated using((select auth.uid()) in(buyer_id,seller_id));
create table public.payment_events(event_key text primary key,order_id uuid not null references public.payment_orders(id),status text not null,created_at timestamptz not null default now());
alter table public.payment_events enable row level security;
revoke all on public.payment_events from public,anon,authenticated;
grant all on public.payment_events to service_role;
create function public.prepare_payment_order(p_buyer uuid,p_quote uuid,p_request uuid) returns setof public.payment_orders language plpgsql security invoker set search_path='' as $$
declare q public.market_quotes;existing public.payment_orders; title_text text;
begin
 select * into q from public.market_quotes where id=p_quote for update;
 if not found or q.owner_id<>p_buyer or q.status<>'accepted' or q.price_unit<>'toplam' then raise exception 'Yalnızca seçilmiş toplam bedelli teklif ödenebilir';end if;
 if not exists(select 1 from public.payment_merchants where user_id=q.bidder_id and approved) then raise exception 'Satıcının ödeme hesabı henüz hazır değil';end if;
 select * into existing from public.payment_orders where buyer_id=p_buyer and request_key=p_request;
 if found then if existing.quote_id<>p_quote then raise exception 'İstek anahtarı farklı siparişe ait';end if;return next existing;return;end if;
 if exists(select 1 from public.payment_orders where quote_id=p_quote and status in('initializing','pending','review','paid')) then raise exception 'Bu teklif için ödeme zaten var';end if;
 select title into title_text from public.market_posts where id=q.post_id;
 return query insert into public.payment_orders(quote_id,buyer_id,seller_id,request_key,title,amount_minor) values(q.id,p_buyer,q.bidder_id,p_request,title_text,round(q.amount*100)::bigint) returning *;
end $$;
revoke all on function public.prepare_payment_order(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_payment_order(uuid,uuid,uuid) to service_role;
create function public.record_payment_result(p_order uuid,p_amount bigint,p_currency text,p_status text,p_payment text,p_transaction text,p_event text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.payment_orders;n integer;
begin
 select * into o from public.payment_orders where id=p_order for update;
 if not found or o.amount_minor<>p_amount or o.currency<>p_currency then raise exception 'Ödeme tutarı veya para birimi eşleşmiyor';end if;
 if p_status not in('pending','review','paid','failed') or coalesce(p_payment,'')='' or coalesce(p_event,'')='' then raise exception 'Geçersiz ödeme sonucu';end if;
 if o.provider_payment_id is not null and o.provider_payment_id<>p_payment then raise exception 'Ödeme kimliği eşleşmiyor';end if;
 insert into public.payment_events(event_key,order_id,status) values(p_event,p_order,p_status) on conflict do nothing;get diagnostics n=row_count;if n=0 then return;end if;
 if o.status='paid' then return;end if;
 update public.payment_orders set status=p_status,provider_payment_id=p_payment,provider_transaction_id=coalesce(p_transaction,provider_transaction_id),updated_at=now() where id=p_order;
end $$;
revoke all on function public.record_payment_result(uuid,bigint,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_payment_result(uuid,bigint,text,text,text,text,text) to service_role;
