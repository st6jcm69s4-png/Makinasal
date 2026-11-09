-- En az yetki: RLS zaten koruyor; bu dosya ikinci bir kilit ekler.
-- 1) Girişsiz (anon) rol hiçbir tabloya yazamaz. 2) Hiçbir istemci rolü TRUNCATE / TRIGGER / REFERENCES kullanamaz
--    (TRUNCATE satır güvenliğini (RLS) dikkate almaz). 3) Yeni tablolar da bu kurallarla doğar.
-- 4) Yazma kuralları yalnızca giriş yapmış role bağlanır. 5) Eksik yabancı anahtar dizini.

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke usage, update on all sequences in schema public from anon;

alter default privileges for role postgres in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public revoke usage, update on sequences from anon;

alter policy "profilimi güncelle" on public.profiles to authenticated;
alter policy "foto ekle" on public.listing_photos to authenticated;
alter policy "ilan ekle" on public.listings to authenticated;
alter policy "ilanımı sil" on public.listings to authenticated;
alter policy "favorilerim" on public.favorites to authenticated;
alter policy "aramalarım" on public.saved_searches to authenticated;
alter policy "konuşma başlat" on public.threads to authenticated;
alter policy "mesaj yaz" on public.messages to authenticated;
alter policy "anlaşma ekle" on public.deals to authenticated;
alter policy "anlaşma onayla" on public.deals to authenticated;
alter policy "yorum yaz" on public.reviews to authenticated;
alter policy "şikayet et" on public.reports to authenticated;
alter policy "şikayetlerim" on public.reports to authenticated;

-- listings UPDATE: iki ayrı kural yerine tek kural (aynı anlam, her satırda tek değerlendirme).
drop policy if exists "ilanımı düzenle" on public.listings;
drop policy if exists "moderator listing update" on public.listings;
create policy "ilanımı düzenle" on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_moderator()))
  with check (seller_id = (select auth.uid()) or (select public.is_moderator()));

create index if not exists message_reports_message_id_idx on public.message_reports (message_id);
