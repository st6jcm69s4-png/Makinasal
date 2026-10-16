-- Company classification and public equipment inventory; no change to existing sale/quote permissions.
alter table public.service_providers add column company_category text check(company_category in ('Hafriyat şirketi','Nakliye şirketi','Makine kiralama şirketi','Parça tedarikçisi','Diğer şirket'));
grant update(company_category) on public.service_providers to authenticated;
create table public.company_inventory (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.service_providers(user_id),
 category text not null check(length(btrim(category)) between 2 and 100),
 brand text not null default '' check(length(brand)<=100),
 model text not null check(length(btrim(model)) between 1 and 120),
 year integer check(year between 1950 and 2100),
 quantity integer not null default 1 check(quantity between 1 and 10000),
 capacity text not null default '' check(length(capacity)<=200),
 description text not null default '' check(length(description)<=1500),
 availability text not null default 'available' check(availability in ('available','busy','maintenance')),
 published boolean not null default true,
 created_at timestamptz not null default now()
);
create index company_inventory_owner on public.company_inventory(owner_id,created_at desc);
alter table public.company_inventory enable row level security;
revoke all on public.company_inventory from anon,authenticated;
grant select on public.company_inventory to anon,authenticated;
grant insert(owner_id,category,brand,model,year,quantity,capacity,description,availability,published) on public.company_inventory to authenticated;
grant update(category,brand,model,year,quantity,capacity,description,availability,published) on public.company_inventory to authenticated;
grant delete on public.company_inventory to authenticated;
create policy inventory_public on public.company_inventory for select to anon,authenticated using(published and exists(select 1 from public.service_providers p where p.user_id=owner_id and p.published));
create policy inventory_owner_read on public.company_inventory for select to authenticated using(owner_id=(select auth.uid()));
create policy inventory_owner_insert on public.company_inventory for insert to authenticated with check(owner_id=(select auth.uid()));
create policy inventory_owner_update on public.company_inventory for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy inventory_owner_delete on public.company_inventory for delete to authenticated using(owner_id=(select auth.uid()));
