alter table public.market_posts add column preferred_provider uuid references public.service_providers(user_id);
create index market_posts_preferred_provider on public.market_posts(preferred_provider) where preferred_provider is not null;
alter table public.market_posts add constraint market_post_coordinates_complete check ((lat is null and lng is null) or (lat is not null and lng is not null and lat between -90 and 90 and lng between -180 and 180));
alter table public.service_providers add constraint provider_coordinates_complete check ((lat is null and lng is null) or (lat is not null and lng is not null and lat between -90 and 90 and lng between -180 and 180));
