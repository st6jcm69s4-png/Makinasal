-- Verification uses Auth's confirmed phone, never user-editable metadata.
create schema if not exists makinasal_auth;
revoke all on schema makinasal_auth from public;
grant usage on schema makinasal_auth to authenticated;
create or replace function public.protect_profile_flags() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user not in ('postgres','supabase_admin','supabase_auth_admin') and (
 new.is_premium is distinct from old.is_premium or new.verified_phone is distinct from old.verified_phone or new.verified_id is distinct from old.verified_id or new.verified_tax is distinct from old.verified_tax
 ) then raise exception 'Bu alan yalnızca sistem tarafından değiştirilebilir';end if;
 if new.phone is distinct from old.phone and current_user not in ('postgres','supabase_admin','supabase_auth_admin') then new.verified_phone:=false;end if;
 return new;
end $$;
create function makinasal_auth.sync_contact_verification() returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid; v_phone text; v_confirmed boolean;
begin
 v_uid:=auth.uid();if v_uid is null then raise exception 'Giriş gerekli';end if;
 select u.phone,(u.phone_confirmed_at is not null and coalesce(u.phone,'')<>'') into v_phone,v_confirmed from auth.users u where u.id=v_uid;
 if not found then raise exception 'Hesap bulunamadı';end if;
 update public.profiles set verified_phone=coalesce(v_confirmed,false),phone=case when v_confirmed then v_phone else phone end where id=v_uid;
end $$;
revoke all on function makinasal_auth.sync_contact_verification() from public,anon;
grant execute on function makinasal_auth.sync_contact_verification() to authenticated;
create function public.sync_contact_verification() returns void language sql security invoker set search_path='' as $$select makinasal_auth.sync_contact_verification();$$;
revoke all on function public.sync_contact_verification() from public,anon;
grant execute on function public.sync_contact_verification() to authenticated;
