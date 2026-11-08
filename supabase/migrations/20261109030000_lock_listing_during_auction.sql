-- Teklif almış ve süren bir açık artırma varken satıcı ilanı kaldıramaz, duraklatamaz, satıldı yapamaz,
-- düzenleyemez veya silemez (yoksa açık artırmayı bu yolla iptal edebilirdi).
-- Yönetici/moderatör (kurallara aykırı ilan) ve sunucu işlemleri (auth.uid() boş) etkilenmez.
create or replace function makinasal_private.lock_listing_during_auction()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  if (select auth.uid()) is null or public.is_moderator() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if exists (select 1 from public.auctions a where a.listing_id = v_id and a.status = 'active' and a.bid_count > 0) then
    if tg_op = 'DELETE' then raise exception 'AUCTION_HAS_BIDS'; end if;
    -- "İlan hâlâ geçerli" onayı gibi sistem alanları dışında her değişiklik kilitli
    if (to_jsonb(new) - array['confirmed_at', 'moderation_status', 'boosted_until', 'prev_price'])
       is distinct from (to_jsonb(old) - array['confirmed_at', 'moderation_status', 'boosted_until', 'prev_price']) then
      raise exception 'AUCTION_HAS_BIDS';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function makinasal_private.lock_listing_during_auction() from public, anon, authenticated;

drop trigger if exists listings_lock_during_auction on public.listings;
create trigger listings_lock_during_auction before update or delete on public.listings
  for each row execute function makinasal_private.lock_listing_during_auction();

-- Fotoğraflar da değiştirilemez (ilanın görünüşü teklif verildikten sonra değişmesin).
create or replace function makinasal_private.lock_photos_during_auction()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_listing uuid := case when tg_op = 'DELETE' then old.listing_id else new.listing_id end;
begin
  if (select auth.uid()) is not null and not public.is_moderator()
     and exists (select 1 from public.auctions a where a.listing_id = v_listing and a.status = 'active' and a.bid_count > 0) then
    raise exception 'AUCTION_HAS_BIDS';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function makinasal_private.lock_photos_during_auction() from public, anon, authenticated;

drop trigger if exists listing_photos_lock_during_auction on public.listing_photos;
create trigger listing_photos_lock_during_auction before insert or update or delete on public.listing_photos
  for each row execute function makinasal_private.lock_photos_during_auction();
