-- Narrow follow-up: preserve every table, trigger, grant and existing notification.
-- Only enforce the already-approved moderation visibility rule on two existing functions.
create or replace function public.listing_phone(p_listing uuid) returns text
language plpgsql security definer set search_path='' as $$
declare ph text; sid uuid;
begin
 if auth.uid() is null then raise exception 'Telefonu görmek için giriş yapmalısın';end if;
 select p.phone,l.seller_id into ph,sid from public.listings l join public.profiles p on p.id=l.seller_id
 where l.id=p_listing and l.status='active' and l.moderation_status='approved';
 if sid is null then return null;end if;
 if sid<>auth.uid() then
  insert into public.listing_stats(listing_id,phones) values(p_listing,1)
  on conflict(listing_id) do update set phones=public.listing_stats.phones+1;
 end if;
 return ph;
end $$;
create or replace function public.notify_price_drop() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.price<old.price and new.status='active' and new.moderation_status='approved' then
  insert into public.notifications(user_id,kind,title,body,url)
  select f.user_id,'price_drop','Favori ilanında fiyat düştü',left(new.title,120),'/ilanlar/'||new.id::text
  from public.favorites f where f.listing_id=new.id and f.user_id is distinct from new.seller_id;
 end if;
 return new;
end $$;
