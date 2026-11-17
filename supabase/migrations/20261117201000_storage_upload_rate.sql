-- Fotoğraf / video yükleme sınırı: kişi başına 10 dakikada en fazla 60 dosya (depolamanın doldurulması engellenir).
create or replace function makinasal_private.guard_upload_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.bucket_id in ('listing-photos', 'listing-videos')
     and not makinasal_private.take_limit('upload:' || (select auth.uid())::text, 60, 600) then
    raise exception using errcode = '23514', message = 'RATE_LIMIT: Çok fazla dosya yüklendi. Birkaç dakika sonra tekrar dene.';
  end if;
  return new;
end $$;
revoke all on function makinasal_private.guard_upload_rate() from public, anon, authenticated;
grant execute on function makinasal_private.guard_upload_rate() to authenticated, supabase_storage_admin;
drop trigger if exists guard_upload_rate on storage.objects;
create trigger guard_upload_rate before insert on storage.objects
  for each row execute function makinasal_private.guard_upload_rate();
