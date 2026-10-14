-- 002: İlan verme (limitler, doğrulamalar), fotoğraf depolama ve güvenlik iyileştirmeleri
-- schema.sql çalıştırıldıktan SONRA bir kez çalıştırın.

-- ===== İlan doğrulamaları =====
alter table listings
  add constraint listings_title_len check (char_length(btrim(title)) between 5 and 120),
  add constraint listings_desc_len check (char_length(description) <= 4000),
  add constraint listings_year_range check (year is null or year between 1950 and 2100),
  add constraint listings_usage_range check (usage_value is null or usage_value between 0 and 10000000),
  add constraint listings_qty_range check (qty is null or qty between 1 and 100000);

-- Ücretsiz üye: en fazla 3 yayında/duraklatılmış ilan; premium: 30
create function enforce_listing_limit() returns trigger
language plpgsql security invoker set search_path = public as $$
declare lim int; cnt int;
begin
  if new.status not in ('active','paused') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active','paused') then return new; end if;
  select case when is_premium then 30 else 3 end into lim from profiles where id = new.seller_id;
  select count(*) into cnt from listings
    where seller_id = new.seller_id and status in ('active','paused')
      and (tg_op = 'INSERT' or id <> new.id);
  if cnt >= coalesce(lim, 3) then
    raise exception 'İlan limitine ulaştın (% ilan). Eski bir ilanı sil ya da satıldı olarak işaretle.', coalesce(lim, 3);
  end if;
  return new;
end $$;
create trigger listings_limit before insert or update on listings
  for each row execute function enforce_listing_limit();

-- Fotoğraf: ücretsiz 8, premium 20; yol yalnızca kendi klasöründe olabilir
drop policy "foto ekle" on listing_photos;
create policy "foto ekle" on listing_photos for all
  using (exists (select 1 from listings l where l.id=listing_id and l.seller_id=auth.uid()))
  with check (
    exists (select 1 from listings l where l.id=listing_id and l.seller_id=auth.uid())
    and path like auth.uid()::text || '/' || listing_id::text || '/%'
  );

create function enforce_photo_limit() returns trigger
language plpgsql security invoker set search_path = public as $$
declare lim int; cnt int;
begin
  select case when p.is_premium then 20 else 8 end into lim
    from listings l join profiles p on p.id = l.seller_id where l.id = new.listing_id;
  select count(*) into cnt from listing_photos where listing_id = new.listing_id;
  if cnt >= coalesce(lim, 8) then
    raise exception 'Bir ilana en fazla % fotoğraf eklenebilir.', coalesce(lim, 8);
  end if;
  return new;
end $$;
create trigger photos_limit before insert on listing_photos
  for each row execute function enforce_photo_limit();

-- ===== Fotoğraf depolama (Supabase Storage) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Yükleme/silme: yalnızca kendi klasörüne (ilk klasör adı = kullanıcı id'si)
create policy "foto yükle" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto sil" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Güvenlik iyileştirmeleri (Supabase denetim önerileri) =====
alter function check_review_allowed() set search_path = public;
alter function protect_profile_flags() set search_path = public;
alter function guard_message() set search_path = public;
-- Tetikleyici fonksiyonları API üzerinden çağrılamasın
revoke execute on function guard_deal() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function enforce_listing_limit() from public, anon, authenticated;
revoke execute on function enforce_photo_limit() from public, anon, authenticated;
