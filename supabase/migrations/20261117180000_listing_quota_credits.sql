-- İlan hakları (17 Kasım 2026)
-- Eski kural: aynı anda yayında olabilecek ilan sayısı (ücretsiz 3, Pro 30, Firma Pro 100).
-- Yeni kural: dönem başına verilebilecek yeni ilan sayısı.
--   Ücretsiz: ayda 2. Pro aylık: ayda 5. Firma Pro aylık: ayda 25.
--   Yıllık üyelikte 12 katı, üyelik yılı başında tek seferde: Pro 60, Firma Pro 300.
--   Aylık dönemler Türkiye saatiyle her ayın 1'inde yenilenir.
-- Hak bitince "ek ilan hakkı" (tek ilan, mağazadan satın alınır ya da davetle kazanılır) kullanılır.
-- Yeni ilan ve satılmış / kaldırılmış ilanı yeniden yayına almak bir hak kullanır; duraklat / devam ettir kullanmaz.
-- İlan silinse de kullanılan hak geri gelmez (sil-yeniden ver ile sınır aşılmasın).

alter table public.profiles add column if not exists premium_period text;
do $$ begin
  alter table public.profiles add constraint profiles_premium_period_check check (premium_period in ('monthly', 'yearly'));
exception when duplicate_object then null; end $$;

-- premium_period de yalnızca sistem tarafından değiştirilir
create or replace function public.protect_profile_flags()
returns trigger language plpgsql set search_path = 'public' as $$
begin
 if current_user not in ('postgres','supabase_admin','supabase_auth_admin') and (
  new.is_premium is distinct from old.is_premium or new.premium_plan is distinct from old.premium_plan or new.premium_until is distinct from old.premium_until
  or new.premium_period is distinct from old.premium_period
  or new.verified_phone is distinct from old.verified_phone or new.verified_id is distinct from old.verified_id or new.verified_tax is distinct from old.verified_tax
 ) then raise exception 'Bu alan yalnızca sistem tarafından değiştirilebilir';end if;
 if new.phone is distinct from old.phone and current_user not in ('postgres','supabase_admin','supabase_auth_admin') then new.verified_phone:=false;end if;
 return new;
end $$;

-- Dönem başına kullanılan ilan hakkı
create table if not exists public.listing_quota_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  used int not null default 0 check (used >= 0),
  primary key (user_id, period_start)
);
alter table public.listing_quota_usage enable row level security;
revoke all on public.listing_quota_usage from anon, authenticated;
grant select on public.listing_quota_usage to authenticated;
drop policy if exists "kendi ilan hakkım" on public.listing_quota_usage;
create policy "kendi ilan hakkım" on public.listing_quota_usage for select to authenticated using (user_id = (select auth.uid()));

-- Ek ilan hakları (tek ilan): satın alınan ve davetle kazanılan
create table if not exists public.listing_credits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  credits int not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);
alter table public.listing_credits enable row level security;
revoke all on public.listing_credits from anon, authenticated;
grant select on public.listing_credits to authenticated;
drop policy if exists "kendi ek ilan hakkım" on public.listing_credits;
create policy "kendi ek ilan hakkım" on public.listing_credits for select to authenticated using (user_id = (select auth.uid()));

-- Kullanıcının şu anki dönemi ve dönem hakkı
create or replace function makinasal_private.listing_quota(p_uid uuid,
  out lim int, out period_start timestamptz, out period_end timestamptz, out period text)
language plpgsql stable security definer set search_path = '' as $$
declare pr record; tr_month timestamptz;
begin
  tr_month := date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  select is_premium, premium_plan, premium_until, premium_period into pr from public.profiles where id = p_uid;
  if coalesce(pr.is_premium, false) and (pr.premium_until is null or pr.premium_until > now()) then
    if pr.premium_period = 'yearly' and pr.premium_until is not null then
      period_start := pr.premium_until - interval '1 year';
      while period_start > now() loop period_start := period_start - interval '1 year'; end loop;
      period_end := period_start + interval '1 year';
      lim := case when pr.premium_plan = 'business' then 300 else 60 end;
      period := 'yearly';
    else
      period_start := tr_month; period_end := tr_month + interval '1 month';
      lim := case when pr.premium_plan = 'business' then 25 else 5 end;
      period := 'monthly';
    end if;
  else
    period_start := tr_month; period_end := tr_month + interval '1 month';
    lim := 2; period := 'free';
  end if;
end $$;
revoke all on function makinasal_private.listing_quota(uuid) from public, anon, authenticated;

-- İlan ekleme / yeniden yayına alma kontrolü
create or replace function public.enforce_listing_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q record; v int;
begin
  if new.status not in ('active', 'paused') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active', 'paused') then return new; end if;
  select * into q from makinasal_private.listing_quota(new.seller_id);
  insert into public.listing_quota_usage as u (user_id, period_start, used) values (new.seller_id, q.period_start, 1)
  on conflict (user_id, period_start) do update set used = u.used + 1 where u.used < q.lim
  returning used into v;
  if v is null then
    update public.listing_credits set credits = credits - 1, updated_at = now()
     where user_id = new.seller_id and credits > 0 returning credits into v;
  end if;
  if v is null then
    raise exception using errcode = 'P0001',
      message = format('LISTING_QUOTA: Bu dönemdeki ilan hakkın doldu (%s ilan). Premium üyelikle ya da ek ilan hakkı alarak ilan verebilirsin.', q.lim);
  end if;
  return new;
end $$;
revoke all on function public.enforce_listing_limit() from public, anon, authenticated;

-- Uygulama için: kalan hak
create or replace function public.my_listing_quota()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); q record; used int; credits int;
begin
  if uid is null then return null; end if;
  select * into q from makinasal_private.listing_quota(uid);
  select u.used into used from public.listing_quota_usage u where u.user_id = uid and u.period_start = q.period_start;
  select c.credits into credits from public.listing_credits c where c.user_id = uid;
  return jsonb_build_object('limit', q.lim, 'used', coalesce(used, 0), 'remaining', greatest(q.lim - coalesce(used, 0), 0),
    'credits', coalesce(credits, 0), 'period', q.period, 'resets_at', q.period_end);
end $$;
revoke all on function public.my_listing_quota() from public, anon;
grant execute on function public.my_listing_quota() to authenticated;

-- Ek ilan hakkı verme (mağaza satın alması, davet ödülü). Yalnızca sunucu.
create or replace function makinasal_private.grant_listing_credits(p_uid uuid, p_n int)
returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  if p_uid is null or p_n is null or p_n < 1 or p_n > 100 then raise exception 'BAD_CREDIT'; end if;
  insert into public.listing_credits as c (user_id, credits) values (p_uid, p_n)
  on conflict (user_id) do update set credits = c.credits + p_n, updated_at = now()
  returning credits into v;
  return v;
end $$;
revoke all on function makinasal_private.grant_listing_credits(uuid, int) from public, anon, authenticated;
create or replace function public.grant_listing_credits(p_uid uuid, p_n int)
returns int language sql security definer set search_path = '' as $$
  select makinasal_private.grant_listing_credits(p_uid, p_n);
$$;
revoke all on function public.grant_listing_credits(uuid, int) from public, anon, authenticated;
grant execute on function public.grant_listing_credits(uuid, int) to service_role;

-- Davet ödülü artık kalıcı sınır artışı değil, ek ilan hakkı: ödül verildiğinde +1
create or replace function makinasal_private.referral_credit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'rewarded' and (tg_op = 'INSERT' or old.status is distinct from 'rewarded') then
    -- En fazla 3 davet ödülü
    if (select count(*) from public.referrals r where r.inviter_id = new.inviter_id and r.status = 'rewarded' and r.invitee_id <> new.invitee_id) < 3 then
      perform makinasal_private.grant_listing_credits(new.inviter_id, 1);
    end if;
  end if;
  return new;
end $$;
revoke all on function makinasal_private.referral_credit() from public, anon, authenticated;
drop trigger if exists referral_credit on public.referrals;
create trigger referral_credit after insert or update of status on public.referrals
  for each row execute function makinasal_private.referral_credit();

-- Mevcut davet ödülleri ek ilan hakkına çevrilir (en fazla 3)
insert into public.listing_credits (user_id, credits)
select inviter_id, least(3, count(*))::int from public.referrals where status = 'rewarded' and inviter_id is not null group by inviter_id
on conflict (user_id) do nothing;

-- Mağaza üyeliği: dönem (aylık / yıllık) da yazılır
drop function if exists public.set_store_premium(uuid, text, timestamptz);
drop function if exists makinasal_private.set_store_premium(uuid, text, timestamptz);
create or replace function makinasal_private.set_store_premium(p_uid uuid, p_plan text, p_until timestamptz, p_period text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare store_max timestamptz;
begin
  if p_uid is null then return; end if;
  if p_plan is null or p_until is null or p_until <= now() then
    -- Yalnızca mağazadan gelen üyelik kapatılır: profildeki bitiş, mağazanın şimdiye kadar bildirdiği en geç
    -- bitişten (1 gün pay ile) daha ileride değilse. Yöneticinin elle verdiği daha uzun süre korunur.
    select max(expires_at) into store_max from public.store_events where user_id = p_uid;
    update public.profiles set is_premium = false, premium_plan = null, premium_until = null, premium_period = null
     where id = p_uid and (premium_until is null or premium_until <= coalesce(store_max, now()) + interval '1 day');
  else
    if p_plan not in ('pro', 'business') then raise exception 'BAD_PLAN'; end if;
    update public.profiles set is_premium = true, premium_plan = p_plan, premium_until = p_until,
      premium_period = case when p_period in ('monthly', 'yearly') then p_period else 'monthly' end
     where id = p_uid;
  end if;
  perform public.sync_premium(p_uid);
end $$;
revoke all on function makinasal_private.set_store_premium(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function makinasal_private.set_store_premium(uuid, text, timestamptz, text) to service_role;
create or replace function public.set_store_premium(p_uid uuid, p_plan text, p_until timestamptz, p_period text default null)
returns void language sql security definer set search_path = '' as $$
  select makinasal_private.set_store_premium(p_uid, p_plan, p_until, p_period);
$$;
revoke all on function public.set_store_premium(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.set_store_premium(uuid, text, timestamptz, text) to service_role;

-- Yönetici üyelik verirken: 12 ay ve üzeri yıllık sayılır
create or replace function public.admin_set_premium(p_user uuid, p_plan text, p_months integer default 1)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz;
begin
 if not (public.is_moderator() or coalesce(auth.role(), 'postgres') in ('service_role', 'postgres')) then
  raise exception 'Yetkisiz işlem';
 end if;
 if p_plan is null then
  update public.profiles set is_premium = false, premium_plan = null, premium_until = null, premium_period = null where id = p_user;
  perform public.sync_premium(p_user);
  return null;
 end if;
 if p_plan not in ('pro', 'business') or p_months is null or p_months < 1 or p_months > 36 then
  raise exception 'Geçersiz tarife veya süre';
 end if;
 select greatest(coalesce(premium_until, now()), now()) + make_interval(months => p_months) into v_until
   from public.profiles where id = p_user;
 if v_until is null then raise exception 'Kullanıcı bulunamadı'; end if;
 update public.profiles set is_premium = true, premium_plan = p_plan, premium_until = v_until,
   premium_period = case when p_months >= 12 then 'yearly' else 'monthly' end where id = p_user;
 perform public.sync_premium(p_user);
 return v_until;
end $$;
