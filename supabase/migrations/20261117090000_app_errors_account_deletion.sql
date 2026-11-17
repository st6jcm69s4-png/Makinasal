-- 1) Uygulama hata kayıtları (çökme takibi). Ayrı bir hizmet yerine kendi veritabanımız.
--    Herkes yazabilir (giriş öncesi çökmeler de görülsün), yalnızca yönetici okur, 30 gün saklanır.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid(),
  message text not null check (char_length(message) between 1 and 2000),
  stack text check (char_length(stack) <= 8000),
  fatal boolean not null default false,
  platform text check (platform in ('ios', 'android', 'web')),
  app_version text check (char_length(app_version) <= 40),
  route text check (char_length(route) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;

revoke all on public.app_errors from anon, authenticated;
grant insert (message, stack, fatal, platform, app_version, route) on public.app_errors to anon, authenticated;
grant select on public.app_errors to authenticated;

drop policy if exists "hata kaydı ekleme" on public.app_errors;
create policy "hata kaydı ekleme" on public.app_errors for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "hata kayıtlarını yönetici okur" on public.app_errors;
create policy "hata kayıtlarını yönetici okur" on public.app_errors for select to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

-- Aynı kişi / cihaz dakikada en fazla 20 kayıt: fazlası sessizce atlanır (hata döngüsü veritabanını doldurmasın)
create or replace function makinasal_private.app_errors_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not makinasal_private.take_limit('app_errors:' || coalesce(auth.uid()::text, makinasal_private.request_ip_hash()::text, 'anon'), 20, 60) then
    return null;
  end if;
  return new;
end $$;
revoke all on function makinasal_private.app_errors_limit() from public, anon, authenticated;
drop trigger if exists app_errors_limit on public.app_errors;
create trigger app_errors_limit before insert on public.app_errors for each row execute function makinasal_private.app_errors_limit();

-- 30 günden eski hata kayıtları her gece silinir
select cron.unschedule('app-errors-retention') where exists (select 1 from cron.job where jobname = 'app-errors-retention');
select cron.schedule('app-errors-retention', '17 3 * * *', $$delete from public.app_errors where created_at < now() - interval '30 days'$$);

-- 2) Uygulama içinden hesap silme.
--    Mesajlar, ödemeler ve değerlendirmeler karşı tarafın kaydı ve yasal saklama yükümlülüğü nedeniyle silinmez;
--    profil kişisel bilgilerden arındırılıp "Silinmiş üye" olur, ilanlar ve iş ağı kayıtları yayından kalkar,
--    favori / kayıtlı arama / bildirim cihazları silinir. Giriş, edge function (delete-account) tarafından kapatılır.
--    Yalnızca sunucu (service_role) çağırabilir.
create or replace function makinasal_private.delete_account_data(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_uid is null then raise exception 'NO_USER'; end if;
  -- Teklif almış açık artırması ya da önde olduğu açık artırma varsa silinmez (karşı tarafın hakkı)
  if exists (
    select 1 from public.auctions a
    where a.status = 'active' and ((a.seller_id = p_uid and a.bid_count > 0) or a.leader_id = p_uid)
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_AUCTION';
  end if;

  update public.listings set status = 'removed' where seller_id = p_uid and status <> 'removed';
  update public.market_posts set status = 'removed' where owner_id = p_uid and status <> 'removed';
  update public.service_providers set published = false where user_id = p_uid;

  delete from public.favorites where user_id = p_uid;
  delete from public.network_favorites where user_id = p_uid;
  delete from public.saved_searches where user_id = p_uid;
  delete from public.push_tokens where user_id = p_uid;
  delete from public.referral_codes where user_id = p_uid;

  update public.profiles
     set full_name = 'Silinmiş üye', phone = null, city = null, district = '',
         store_name = null, is_store = false, bio = '', company_bio = ''
   where id = p_uid;

  -- Giriş bağlantıları (Google, e-posta) ve telefon silinir: aynı hesapla yeniden kayıt olunabilsin
  delete from auth.identities where user_id = p_uid;
  update auth.users set phone = null, raw_user_meta_data = '{}'::jsonb where id = p_uid;

  insert into public.data_requests (user_id, kind, status, note, handled_at)
  values (p_uid, 'delete', 'done', 'Uygulama içinden silindi', now());
end $$;
revoke all on function makinasal_private.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function makinasal_private.delete_account_data(uuid) to service_role;
grant usage on schema makinasal_private to service_role;

-- Sunucu fonksiyonu (delete-account) API üzerinden çağırabilsin diye public şemada ince sarmalayıcı; yalnızca service_role.
create or replace function public.delete_account_data(p_uid uuid)
returns void language sql security definer set search_path = '' as $$
  select makinasal_private.delete_account_data(p_uid);
$$;
revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
