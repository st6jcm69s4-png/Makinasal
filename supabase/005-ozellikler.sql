-- 005: Prototipteki özellikler için veritabanı desteği
-- schema.sql, 002, 003 ve 004'ten sonra bir kez çalıştırın.
-- İlan alanları, favori fiyatı, kayıtlı arama bildirimi, puan etiketleri, teklif mesajı,
-- okunmamış mesaj sayacı, şikayet takibi, ilan istatistikleri ve telefon gizliliği.

-- ===== İlan alanları =====
alter table listings
  add column brand text,
  add column model text,
  add column takas boolean not null default false,
  add column serial_declared boolean not null default false,
  add column prev_price numeric(14,2),
  add column confirmed_at timestamptz not null default now(),
  add column boosted_until timestamptz;

alter table listings
  add constraint listings_brand_len check (brand is null or char_length(brand) <= 60),
  add constraint listings_model_len check (model is null or char_length(model) <= 80);

-- Önceki fiyat (fiyat düşünce), son doğrulama (hâlâ satılık) ve öne çıkarma alanı sunucuda yönetilir
create function listing_flags() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.prev_price := null;
    new.confirmed_at := now();
    if auth.uid() is not null then new.boosted_until := null; end if;
  else
    if new.price < old.price then new.prev_price := old.price;
    elsif new.price > old.price then new.prev_price := null;
    else new.prev_price := old.prev_price; end if;
    if new.confirmed_at is distinct from old.confirmed_at then new.confirmed_at := now(); end if;
    if auth.uid() is not null then new.boosted_until := old.boosted_until; end if;
  end if;
  return new;
end $$;
create trigger listings_flags before insert or update on listings
  for each row execute function listing_flags();
revoke execute on function listing_flags() from public, anon, authenticated;

-- ===== İlan istatistikleri (görüntülenme, telefon) — yalnızca ilan sahibi görür =====
create table listing_stats (
  listing_id uuid primary key references listings(id) on delete cascade,
  views int not null default 0,
  phones int not null default 0
);
alter table listing_stats enable row level security;
create policy "ilan istatistiğim" on listing_stats for select
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()));

create function track_view(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from listings where id = p_listing and status = 'active' and seller_id is distinct from auth.uid()) then
    insert into listing_stats(listing_id, views) values (p_listing, 1)
    on conflict (listing_id) do update set views = listing_stats.views + 1;
  end if;
end $$;
grant execute on function track_view(uuid) to anon, authenticated;

-- ===== Telefon gizliliği: numara herkese açık okunamaz, yalnızca "Telefonu göster" ile (girişli üye) =====
alter table profiles
  add column verified_id boolean not null default false,
  add column verified_tax boolean not null default false,
  add constraint profiles_phone_fmt check (phone is null or phone ~ '^[0-9+() -]{10,20}$'),
  add constraint profiles_name_len check (char_length(full_name) <= 80 and (store_name is null or char_length(store_name) <= 80));

revoke select on profiles from anon, authenticated;
grant select (id, full_name, city, is_store, store_name, is_premium, verified_phone, verified_id, verified_tax, created_at)
  on profiles to anon, authenticated;
-- Not: profiles'a ileride eklenecek sütunlar için buraya ayrıca "grant select (sütun)" gerekir.

create or replace function protect_profile_flags() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and (
       new.is_premium is distinct from old.is_premium
    or new.verified_phone is distinct from old.verified_phone
    or new.verified_id is distinct from old.verified_id
    or new.verified_tax is distinct from old.verified_tax) then
    raise exception 'Bu alan yalnızca sistem tarafından değiştirilebilir';
  end if;
  -- Telefon numarası değişirse doğrulama sıfırlanır
  if new.phone is distinct from old.phone then new.verified_phone := false; end if;
  return new;
end $$;

create function my_phone() returns text language sql stable security definer set search_path = public as $$
  select phone from profiles where id = auth.uid()
$$;
revoke execute on function my_phone() from public, anon;
grant execute on function my_phone() to authenticated;

create function listing_phone(p_listing uuid) returns text
language plpgsql security definer set search_path = public as $$
declare ph text; sid uuid;
begin
  if auth.uid() is null then raise exception 'Telefonu görmek için giriş yapmalısın'; end if;
  select p.phone, l.seller_id into ph, sid
    from listings l join profiles p on p.id = l.seller_id where l.id = p_listing and l.status = 'active';
  if sid is null then return null; end if;
  if sid <> auth.uid() then
    insert into listing_stats(listing_id, phones) values (p_listing, 1)
    on conflict (listing_id) do update set phones = listing_stats.phones + 1;
  end if;
  return ph;
end $$;
revoke execute on function listing_phone(uuid) from public, anon;
grant execute on function listing_phone(uuid) to authenticated;

-- ===== Favoriler: eklendiği andaki fiyat (fiyat düşünce haber vermek için) =====
alter table favorites
  add column price_at_save numeric(14,2),
  add column created_at timestamptz not null default now();
create function favorite_price() returns trigger language plpgsql set search_path = public as $$
begin
  new.price_at_save := (select price from listings where id = new.listing_id);
  return new;
end $$;
create trigger favorites_price before insert on favorites for each row execute function favorite_price();
revoke execute on function favorite_price() from public, anon, authenticated;

-- ===== Kayıtlı aramalar =====
alter table saved_searches
  add column notify boolean not null default true,
  add column last_seen_at timestamptz not null default now(),
  add constraint saved_searches_size check (pg_column_size(query) <= 2000);
create function limit_saved_searches() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'En fazla 20 arama kaydedebilirsin.';
  end if;
  return new;
end $$;
create trigger saved_searches_limit before insert on saved_searches for each row execute function limit_saved_searches();
revoke execute on function limit_saved_searches() from public, anon, authenticated;

-- ===== Puan etiketleri ve yorum güvenliği =====
alter table reviews
  add column tags text[] not null default '{}',
  add constraint reviews_tags_ok check (tags <@ array['İlana uygun çıktı','Hızlı cevap verdi','Fiyat tutarlıydı','Belgeler tamdı']::text[]),
  add constraint reviews_comment_len check (comment is null or char_length(comment) <= 500);
create function guard_review_text() returns trigger language plpgsql set search_path = public as $$
begin
  if new.comment is not null and (
       new.comment ~* '\mTR\s?\d{2}(\s?\d{4}){5}\s?\d{2}\M|\miban\M'
    or new.comment ~* '(https?://|www\.|wa\.me|t\.me|\.com\M|\.net\M|\.org\M)') then
    raise exception 'Yorumda IBAN veya harici link paylaşılamaz';
  end if;
  return new;
end $$;
create trigger reviews_text_guard before insert on reviews for each row execute function guard_review_text();

-- ===== Mesajlar: teklif türü =====
alter table messages
  add column kind text not null default 'text' check (kind in ('text','offer')),
  add column offer_amount numeric(14,2),
  add constraint messages_offer_ok check ((kind = 'offer' and offer_amount is not null and offer_amount > 0) or (kind = 'text' and offer_amount is null));

-- ===== Okunmamış mesajlar =====
alter table threads
  add column buyer_read_at timestamptz not null default now(),
  add column seller_read_at timestamptz not null default now();

create function mark_thread_read(p_thread uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update threads set buyer_read_at = now() where id = p_thread and buyer_id = auth.uid();
  update threads set seller_read_at = now() where id = p_thread and seller_id = auth.uid();
end $$;
revoke execute on function mark_thread_read(uuid) from public, anon;
grant execute on function mark_thread_read(uuid) to authenticated;

create function unread_counts() returns table(thread_id uuid, n bigint)
language sql stable security invoker set search_path = public as $$
  select t.id, count(m.id)
  from threads t join messages m on m.thread_id = t.id
  where auth.uid() in (t.buyer_id, t.seller_id)
    and m.sender_id <> auth.uid()
    and m.created_at > case when t.buyer_id = auth.uid() then t.buyer_read_at else t.seller_read_at end
  group by t.id
$$;
revoke execute on function unread_counts() from public, anon;
grant execute on function unread_counts() to authenticated;

-- ===== Şikayetler: takip numarası, kötüye kullanım koruması =====
-- ÖNEMLİ: Güven seviyesini yalnızca moderatörün "doğrulandı" dediği şikayetler etkiler.
alter table reports
  add column ticket bigint generated always as identity,
  add column verified boolean not null default false,
  add column status text not null default 'open',
  add constraint reports_reason_len check (char_length(reason) between 3 and 500),
  add constraint reports_target check (listing_id is not null or user_id is not null);
create unique index reports_once_per_listing on reports (reporter_id, listing_id) where listing_id is not null;
create unique index reports_once_per_user on reports (reporter_id, user_id) where user_id is not null;

create function guard_report() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then new.verified := false; new.status := 'open'; end if;
  if new.listing_id is not null and exists (select 1 from listings where id = new.listing_id and seller_id = new.reporter_id) then
    raise exception 'Kendi ilanını şikayet edemezsin';
  end if;
  if new.user_id is not null and new.user_id = new.reporter_id then
    raise exception 'Kendini şikayet edemezsin';
  end if;
  return new;
end $$;
create trigger reports_guard before insert on reports for each row execute function guard_report();
revoke execute on function guard_report() from public, anon, authenticated;

drop policy "şikayet et" on reports;
create policy "şikayet et" on reports for insert with check (auth.uid() = reporter_id and verified = false);
create policy "şikayetlerim" on reports for select using (auth.uid() = reporter_id);

-- ===== Güven istatistiği: satıcı ve alıcı puanı ayrı; yalnızca doğrulanmış şikayetler =====
create or replace view user_stats as
select p.id,
  coalesce((select avg(score) from reviews r where r.reviewee_id = p.id), 0) as score,
  (select count(*) from reviews r where r.reviewee_id = p.id) as review_count,
  (select count(*) from threads t join deals d on d.thread_id = t.id
     where d.completed_at is not null and (t.buyer_id = p.id or t.seller_id = p.id)) as deals,
  (select count(*) from reports x left join listings l on l.id = x.listing_id
     where x.verified and (x.user_id = p.id or l.seller_id = p.id)) as reports,
  coalesce((select avg(score) from reviews r where r.reviewee_id = p.id and r.role = 'seller'), 0) as seller_score,
  (select count(*) from reviews r where r.reviewee_id = p.id and r.role = 'seller') as seller_reviews,
  coalesce((select avg(score) from reviews r where r.reviewee_id = p.id and r.role = 'buyer'), 0) as buyer_score,
  (select count(*) from reviews r where r.reviewee_id = p.id and r.role = 'buyer') as buyer_reviews
from profiles p;
