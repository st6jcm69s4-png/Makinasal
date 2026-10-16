-- Isolated marketplace extension. Existing sales, reputation and moderation are unchanged.
create table public.market_posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('rental_machine','rental_operator','job','part_request')),
 title text not null check(length(btrim(title)) between 5 and 160),
 description text not null check(length(btrim(description)) between 20 and 8000),
 category text not null check(length(category) between 2 and 100),
 city text not null check(length(city) between 2 and 80), district text not null default '' check(length(district)<=120),
 lat double precision, lng double precision,
 start_date date, end_date date,
 price numeric(14,2) check(price>0), price_unit text not null default 'toplam' check(price_unit in ('toplam','saat','gün','ay','adet')),
 quantity integer not null default 1 check(quantity between 1 and 100000),
 specs text not null default '' check(length(specs)<=1000),
 status text not null default 'open' check(status in ('open','closed','removed')),
 created_at timestamptz not null default now(),
 check((lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180)),
 check(end_date is null or (start_date is not null and end_date>=start_date)),
 check(kind not in ('rental_machine','rental_operator') or price is not null)
);
create index market_posts_browse on public.market_posts(kind,status,city,created_at desc);
create index market_posts_owner on public.market_posts(owner_id);
create table public.service_providers (
 user_id uuid primary key references public.profiles(id),
 name text not null check(length(btrim(name)) between 2 and 120),
 kind text not null check(kind in ('excavation','supplier','operator','rental')),
 description text not null check(length(btrim(description)) between 20 and 5000),
 city text not null check(length(city) between 2 and 80), district text not null default '' check(length(district)<=120),
 service_cities text[] not null check(cardinality(service_cities) between 1 and 81),
 specialties text[] not null check(cardinality(specialties) between 1 and 20),
 lat double precision,lng double precision,
 published boolean not null default true,
 created_at timestamptz not null default now(),
 check((lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180))
);
create index service_providers_city on public.service_providers(city,kind) where published;
create index service_providers_areas on public.service_providers using gin(service_cities);
create table public.market_quotes (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.market_posts(id),
 owner_id uuid not null references public.profiles(id), bidder_id uuid not null references public.profiles(id),
 display_name text not null check(length(btrim(display_name)) between 2 and 120),
 amount numeric(14,2) not null check(amount>0), price_unit text not null check(price_unit in ('toplam','saat','gün','ay','adet')),
 note text not null check(length(btrim(note)) between 10 and 3000),
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 unique(post_id,bidder_id), check(owner_id<>bidder_id)
);
create index market_quotes_owner on public.market_quotes(owner_id);
create index market_quotes_bidder on public.market_quotes(bidder_id);
create unique index market_one_selected_quote on public.market_quotes(post_id) where status='accepted';
create table public.market_quote_messages (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.market_quotes(id),
 sender_id uuid not null references public.profiles(id),body text not null check(length(btrim(body)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index market_quote_messages_quote on public.market_quote_messages(quote_id,created_at);
alter table public.market_posts enable row level security;
alter table public.service_providers enable row level security;
alter table public.market_quotes enable row level security;
alter table public.market_quote_messages enable row level security;
revoke all on public.market_posts,public.service_providers,public.market_quotes,public.market_quote_messages from anon,authenticated;
grant select on public.market_posts,public.service_providers to anon,authenticated;
grant insert on public.market_posts,public.service_providers,public.market_quotes,public.market_quote_messages to authenticated;
grant select on public.market_quotes,public.market_quote_messages to authenticated;
grant update(title,description,category,city,district,lat,lng,start_date,end_date,price,price_unit,quantity,specs,status) on public.market_posts to authenticated;
grant update(name,kind,description,city,district,service_cities,specialties,lat,lng,published) on public.service_providers to authenticated;
grant update(display_name,amount,price_unit,note,status) on public.market_quotes to authenticated;
create policy posts_read on public.market_posts for select to anon,authenticated using(status<>'removed' or owner_id=(select auth.uid()));
create policy posts_insert on public.market_posts for insert to authenticated with check(owner_id=(select auth.uid()));
create policy posts_update on public.market_posts for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy providers_read on public.service_providers for select to anon,authenticated using(published or user_id=(select auth.uid()));
create policy providers_insert on public.service_providers for insert to authenticated with check(user_id=(select auth.uid()));
create policy providers_update on public.service_providers for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy quotes_read on public.market_quotes for select to authenticated using((select auth.uid()) in (owner_id,bidder_id));
create policy quotes_insert on public.market_quotes for insert to authenticated with check(bidder_id=(select auth.uid()) and status='pending');
create policy quotes_update on public.market_quotes for update to authenticated using((select auth.uid()) in (owner_id,bidder_id)) with check((select auth.uid()) in (owner_id,bidder_id));
create policy quote_messages_read on public.market_quote_messages for select to authenticated using(exists(select 1 from public.market_quotes q where q.id=quote_id and (select auth.uid()) in(q.owner_id,q.bidder_id)));
create policy quote_messages_insert on public.market_quote_messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.market_quotes q where q.id=quote_id and (select auth.uid()) in(q.owner_id,q.bidder_id) and q.status in('pending','accepted')));
-- Internal trigger only: validates participants against the real post and serializes quote/closing races.
create schema if not exists market_private;
revoke all on schema market_private from public,anon,authenticated;
create function market_private.guard_quote() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.market_posts; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Giriş gerekli'; end if;
 select * into p from public.market_posts where id=new.post_id for update;
 if not found or p.owner_id<>new.owner_id then raise exception 'İlan sahibi uyuşmuyor'; end if;
 if TG_OP='INSERT' then
   if new.bidder_id<>uid or new.owner_id=uid or new.status<>'pending' or p.status<>'open' then raise exception 'Bu ilana teklif verilemez'; end if;
 else
   if (new.id,new.post_id,new.owner_id,new.bidder_id,new.created_at) is distinct from (old.id,old.post_id,old.owner_id,old.bidder_id,old.created_at) then raise exception 'Teklif kimliği değiştirilemez'; end if;
   if old.status<>'pending' then raise exception 'Sonuçlanmış teklif değiştirilemez'; end if;
   if uid=old.owner_id then
     if (new.display_name,new.amount,new.price_unit,new.note) is distinct from (old.display_name,old.amount,old.price_unit,old.note) or new.status not in('accepted','declined') or p.status<>'open' then raise exception 'Yalnızca açık teklif seçilebilir veya reddedilebilir'; end if;
   elsif uid=old.bidder_id then
     if new.status not in('pending','withdrawn') or p.status<>'open' then raise exception 'Teklif değiştirilemez'; end if;
   else raise exception 'Yetkisiz işlem'; end if;
 end if;
 return new;
end $$;
revoke all on function market_private.guard_quote() from public,anon,authenticated;
create trigger market_guard_quote before insert or update on public.market_quotes for each row execute function market_private.guard_quote();
