-- Makinasal veritabanı şeması (Supabase / Postgres) — SQL Editor'e yapıştırıp çalıştırın.
create extension if not exists "pgcrypto";

create type listing_kind as enum ('machine','part','tire');
create type listing_status as enum ('active','sold','paused','removed');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text,
  city text,
  is_store boolean not null default false,
  store_name text,
  is_premium boolean not null default false,
  verified_phone boolean not null default false,
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  kind listing_kind not null,
  category text not null,
  title text not null,
  description text not null default '',
  price numeric(14,2) not null check (price >= 0),
  city text not null,
  lat double precision, lng double precision,
  year int, usage_value int, usage_unit text check (usage_unit in ('saat','km')),
  spec text, cond text, compat text, qty int,
  status listing_status not null default 'active',
  created_at timestamptz not null default now()
);
create index on listings (status, kind, category, city, price);

create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  path text not null,
  position int not null default 0
);

create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  primary key (user_id, listing_id)
);

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  query jsonb not null,
  created_at timestamptz not null default now()
);

create table threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Karşılıklı onaylı satış: iki taraf da onaylamadan puan verilemez
create table deals (
  thread_id uuid primary key references threads(id) on delete cascade,
  buyer_confirmed boolean not null default false,
  seller_confirmed boolean not null default false,
  completed_at timestamptz
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  reviewee_id uuid not null references profiles(id),
  role text not null check (role in ('buyer','seller')), -- değerlendirilenin rolü
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (thread_id, reviewer_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  listing_id uuid references listings(id) on delete cascade,
  user_id uuid references profiles(id),
  reason text not null,
  created_at timestamptz not null default now()
);

-- Güven istatistiği (puan ortalaması, anlaşma sayısı, şikayet sayısı)
create view user_stats as
select p.id,
  coalesce((select avg(score) from reviews r where r.reviewee_id=p.id),0) as score,
  (select count(*) from reviews r where r.reviewee_id=p.id) as review_count,
  (select count(*) from threads t join deals d on d.thread_id=t.id
     where d.completed_at is not null and (t.buyer_id=p.id or t.seller_id=p.id)) as deals,
  (select count(*) from reports x where x.user_id=p.id) as reports
from profiles p;

-- Yeni kullanıcı için otomatik profil
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Yorum yalnızca iki taraf da onayladıysa
create function check_review_allowed() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from deals where thread_id=new.thread_id and buyer_confirmed and seller_confirmed) then
    raise exception 'Satış iki taraf tarafından onaylanmadan puan verilemez';
  end if; return new; end $$;
create trigger reviews_guard before insert on reviews for each row execute function check_review_allowed();

-- RLS
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table favorites enable row level security;
alter table saved_searches enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;
alter table deals enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;

create policy "profil herkese açık" on profiles for select using (true);
create policy "profilimi güncelle" on profiles for update using (auth.uid()=id);

create policy "aktif ilanlar herkese açık" on listings for select using (status<>'removed' or seller_id=auth.uid());
create policy "ilan ekle" on listings for insert with check (auth.uid()=seller_id);
create policy "ilanımı düzenle" on listings for update using (auth.uid()=seller_id);
create policy "ilanımı sil" on listings for delete using (auth.uid()=seller_id);

create policy "foto görülür" on listing_photos for select using (true);
create policy "foto ekle" on listing_photos for all
  using (exists (select 1 from listings l where l.id=listing_id and l.seller_id=auth.uid()))
  with check (exists (select 1 from listings l where l.id=listing_id and l.seller_id=auth.uid()));

create policy "favorilerim" on favorites for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "aramalarım" on saved_searches for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "konuşmalarım" on threads for select using (auth.uid() in (buyer_id, seller_id));
create policy "konuşma başlat" on threads for insert
  with check (auth.uid()=buyer_id and buyer_id<>seller_id
    and exists (select 1 from listings l where l.id=listing_id and l.seller_id=threads.seller_id and l.status='active'));

create policy "mesajlarım" on messages for select
  using (exists (select 1 from threads t where t.id=thread_id and auth.uid() in (t.buyer_id,t.seller_id)));
create policy "mesaj yaz" on messages for insert
  with check (auth.uid()=sender_id and exists (select 1 from threads t where t.id=thread_id and auth.uid() in (t.buyer_id,t.seller_id)));

create policy "anlaşmam" on deals for select
  using (exists (select 1 from threads t where t.id=thread_id and auth.uid() in (t.buyer_id,t.seller_id)));
create policy "anlaşma ekle" on deals for insert
  with check (exists (select 1 from threads t where t.id=thread_id and auth.uid() in (t.buyer_id,t.seller_id)));
create policy "anlaşma onayla" on deals for update
  using (exists (select 1 from threads t where t.id=thread_id and auth.uid() in (t.buyer_id,t.seller_id)));

create policy "yorumlar herkese açık" on reviews for select using (true);
create policy "yorum yaz" on reviews for insert
  with check (
    auth.uid()=reviewer_id
    and exists (select 1 from threads t where t.id=thread_id
      and ((t.buyer_id=reviewer_id and t.seller_id=reviewee_id and role='seller')
        or (t.seller_id=reviewer_id and t.buyer_id=reviewee_id and role='buyer')))
  );

create policy "şikayet et" on reports for insert with check (auth.uid()=reporter_id);


-- ===== Güvenlik sertleştirmesi =====

-- Kullanıcı kendi profilinde premium / doğrulama alanlarını değiştiremez (bunlar sunucudan yönetilir)
create function protect_profile_flags() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.is_premium is distinct from old.is_premium
     or new.verified_phone is distinct from old.verified_phone) then
    raise exception 'Bu alan yalnızca sistem tarafından değiştirilebilir';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on profiles for each row execute function protect_profile_flags();

-- Anlaşma: herkes yalnızca kendi onayını verir; iki onay tamamlanınca completed_at otomatik dolar
create function guard_deal() returns trigger language plpgsql security definer set search_path=public as $$
declare t threads;
begin
  select * into t from threads where id=new.thread_id;
  if tg_op='INSERT' then
    if auth.uid()=t.buyer_id then new.seller_confirmed:=false; else new.buyer_confirmed:=false; end if;
    new.completed_at:=null;
  else
    if auth.uid()<>t.buyer_id then new.buyer_confirmed:=old.buyer_confirmed; end if;
    if auth.uid()<>t.seller_id then new.seller_confirmed:=old.seller_confirmed; end if;
    new.thread_id:=old.thread_id;
    new.completed_at:=old.completed_at;
  end if;
  if new.buyer_confirmed and new.seller_confirmed and new.completed_at is null then
    new.completed_at:=now();
  end if;
  return new;
end $$;
create trigger deals_guard before insert or update on deals for each row execute function guard_deal();

-- Mesajlarda IBAN / link sunucu tarafında da engellenir (istemci filtresi atlatılamasın)
create function guard_message() returns trigger language plpgsql as $$
begin
  if new.body ~* '\mTR\s?\d{2}(\s?\d{4}){5}\s?\d{2}\M|\miban\M' then
    raise exception 'Mesajlarda IBAN paylaşımı engellenir';
  end if;
  if new.body ~* '(https?://|www\.|wa\.me|t\.me|\.com\M|\.net\M|\.org\M)' then
    raise exception 'Mesajlarda harici link paylaşımı engellenir';
  end if;
  return new;
end $$;
create trigger messages_guard before insert on messages for each row execute function guard_message();

-- Yorum: puan verilen kişi, o konuşmadaki karşı taraf olmalı (policy ile birlikte çift kilit)
-- Not: reviews tablosunda güncelleme/silme politikası yoktur; yorumlar değiştirilemez.
