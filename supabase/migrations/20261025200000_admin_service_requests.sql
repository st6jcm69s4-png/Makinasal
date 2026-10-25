-- Yöneticiler talep sahibinin iletişim bilgisini yalnızca bu RPC ile görür.
create function public.admin_service_requests() returns table(id uuid,kind text,note text,city text,status text,created_at timestamptz,listing_id uuid,listing_title text,full_name text,phone text,email text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Yetkisiz';end if;
 return query select r.id,r.kind,r.note,r.city,r.status,r.created_at,r.listing_id,l.title,p.full_name,p.phone,u.email::text
 from public.service_requests r left join public.listings l on l.id=r.listing_id left join public.profiles p on p.id=r.user_id left join auth.users u on u.id=r.user_id
 order by (r.status='new') desc,r.created_at desc limit 200;
end $$;
revoke all on function public.admin_service_requests() from public,anon;
grant execute on function public.admin_service_requests() to authenticated;
