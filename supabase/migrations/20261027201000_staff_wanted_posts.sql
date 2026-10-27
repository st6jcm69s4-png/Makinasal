-- Eleman ilanı: işveren operatör / şoför / usta arar. Fiyat isteğe bağlıdır.
alter table public.market_posts drop constraint market_posts_kind_check;
alter table public.market_posts add constraint market_posts_kind_check check (kind in ('rental_machine','rental_operator','job','part_request','staff_wanted'));
alter table public.market_posts drop constraint market_posts_personnel_kind;
alter table public.market_posts add constraint market_posts_personnel_kind check (personnel_role is null or kind in ('rental_operator','staff_wanted'));
