-- Premium avantajları (normal üyenin mevcut hakkı azalmaz):
--  * Kayıtlı arama: ücretsiz 20 (aynı), premium 50
--  * Makine karnesi: ücretsiz 50 kayıt (aynı), premium 100
--  * Destek / hizmet talepleri yönetim listesinde premium üyeler önce
create or replace function public.limit_saved_searches()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare lim int := case when makinasal_private.is_premium(new.user_id) then 50 else 20 end;
begin
  if (select count(*) from public.saved_searches s where s.user_id = new.user_id) >= lim then
    raise exception 'limit: En fazla % arama kaydedebilirsin.', lim;
  end if;
  return new;
end $$;
revoke all on function public.limit_saved_searches() from public, anon, authenticated;

create or replace function makinasal_private.service_log_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare lim int := case when makinasal_private.is_premium(new.seller_id) then 100 else 50 end;
begin
  if (select count(*) from public.listing_service_logs x where x.listing_id = new.listing_id) >= lim then
    raise exception 'limit: Bir ilana en fazla % bakım kaydı eklenebilir', lim;
  end if;
  return new;
end $$;
revoke all on function makinasal_private.service_log_limit() from public, anon, authenticated;

create or replace function public.admin_service_requests()
returns table(id uuid, kind text, note text, city text, status text, created_at timestamptz, listing_id uuid, listing_title text, full_name text, phone text, email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
 return query select r.id,r.kind,r.note,r.city,r.status,r.created_at,r.listing_id,l.title,p.full_name,p.phone,u.email::text
 from public.service_requests r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.user_id left join auth.users u on u.id=r.user_id
 order by (r.status='new') desc, makinasal_private.is_premium(r.user_id) desc, r.created_at desc limit 200;
end $$;
