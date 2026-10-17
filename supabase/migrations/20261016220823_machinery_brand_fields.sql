-- Separate optional brand/model fields support exact brand filtering. Existing free-form content remains intact.
alter table public.market_posts add column brand text not null default '' check(length(brand)<=100), add column model text not null default '' check(length(model)<=120);
grant update(brand,model) on public.market_posts to authenticated;
create index market_posts_brand on public.market_posts(brand,kind,status,city);
