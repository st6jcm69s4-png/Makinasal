-- Güvenlik sıkılaştırma (17 Kasım 2026 denetimi)

-- 1) Kayıt tarihi kullanıcı tarafından yazılamaz.
--    Önceden ilan / mesaj / yorum / şikayet eklerken created_at elle gönderilebiliyordu
--    (ör. ilan tarihini ileri atıp "en yeni" sıralamasında hep üstte kalmak).
create or replace function makinasal_private.force_created_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if; -- sunucu / yönetici işlemleri
  if tg_op = 'INSERT' then new.created_at := now();
  else new.created_at := old.created_at;
  end if;
  return new;
end $$;
revoke all on function makinasal_private.force_created_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['listings','messages','reviews','reports','threads','market_posts','market_quotes','service_providers'] loop
    execute format('drop trigger if exists a_force_created_at on public.%I', t);
    execute format('create trigger a_force_created_at before insert or update on public.%I for each row execute function makinasal_private.force_created_at()', t);
  end loop;
end $$;

-- 2) Dakikada yazma sınırı eksik tablolara da eklenir (kişi başına, tablo başına dakikada 20 kayıt).
do $$
declare t text;
begin
  foreach t in array array['threads','favorites','company_inventory','data_requests','deals','message_reports','network_favorites','reviews','service_providers','user_blocks'] loop
    execute format('drop trigger if exists guard_write_rate on public.%I', t);
    execute format('create trigger guard_write_rate before insert on public.%I for each row execute function makinasal_private.guard_write_rate()', t);
  end loop;
end $$;

-- 3) Güncelleme sınırı: kişi başına, tablo başına dakikada 30 güncelleme.
--    (Örn. ilan fiyatını sürekli düşürüp-artırıp favorileyenlere bildirim yağdırmak engellenir.)
create or replace function makinasal_private.guard_update_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if not makinasal_private.take_limit('upd:' || tg_table_name || ':' || (select auth.uid())::text, 30, 60) then
    raise exception using errcode = '23514', message = 'RATE_LIMIT: Çok fazla işlem. Bir dakika sonra tekrar dene.';
  end if;
  return new;
end $$;
revoke all on function makinasal_private.guard_update_rate() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['listings','market_posts','market_quotes','service_providers','company_inventory','profiles','deals'] loop
    execute format('drop trigger if exists guard_update_rate on public.%I', t);
    execute format('create trigger guard_update_rate before update on public.%I for each row execute function makinasal_private.guard_update_rate()', t);
  end loop;
end $$;

-- 4) Telefon numarası gösterme sınırı: kişi başına saatte 30, günde 100 numara.
--    Toplu numara toplanması (scraping) engellenir. Aynı ilanın numarasına tekrar bakmak istatistiği şişirmez.
create or replace function public.listing_phone(p_listing uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare ph text; sid uuid; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Telefonu görmek için giriş yapmalısın';end if;
 select p.phone,l.seller_id into ph,sid from public.listings l join public.profiles p on p.id=l.seller_id
 where l.id=p_listing and l.status='active' and l.moderation_status='approved';
 if sid is null then return null;end if;
 if sid<>uid then
  -- Aynı ilana 24 saat içinde tekrar bakmak sınırı da istatistiği de etkilemez
  if makinasal_private.take_limit('phone:'||uid::text||':'||p_listing::text,1,86400) then
   if not makinasal_private.take_limit('phone-h:'||uid::text,30,3600) or not makinasal_private.take_limit('phone-d:'||uid::text,100,86400) then
    raise exception using errcode='23514', message='RATE_LIMIT: Çok fazla numara görüntülendi. Biraz sonra tekrar dene.';
   end if;
   insert into public.listing_stats(listing_id,phones) values(p_listing,1)
   on conflict(listing_id) do update set phones=public.listing_stats.phones+1;
  end if;
 end if;
 return ph;
end $$;

create or replace function public.provider_phone(p_provider uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare ph text; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Telefonu görmek için giriş yapmalısın'; end if;
 if uid <> p_provider and makinasal_private.take_limit('pphone:'||uid::text||':'||p_provider::text,1,86400) then
  if not makinasal_private.take_limit('phone-h:'||uid::text,30,3600) or not makinasal_private.take_limit('phone-d:'||uid::text,100,86400) then
   raise exception using errcode='23514', message='RATE_LIMIT: Çok fazla numara görüntülendi. Biraz sonra tekrar dene.';
  end if;
 end if;
 select p.phone into ph from public.service_providers s join public.profiles p on p.id=s.user_id
 where s.user_id=p_provider and s.published;
 return ph;
end $$;
