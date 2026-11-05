-- Premium tarifeleri (pro, business), sıralama önceliği, ilan limitleri ve yapay zeka asistanı kotası.

alter table public.profiles
  add column if not exists premium_plan text check (premium_plan in ('pro','business')),
  add column if not exists premium_until timestamptz;
alter table public.market_posts add column if not exists premium_rank smallint not null default 0;
alter table public.service_providers add column if not exists premium_rank smallint not null default 0;

-- Premium alanlarını yalnızca sistem değiştirebilir.
create or replace function public.protect_profile_flags()
 returns trigger language plpgsql set search_path to 'public' as $function$
begin
 if current_user not in ('postgres','supabase_admin','supabase_auth_admin') and (
  new.is_premium is distinct from old.is_premium or new.premium_plan is distinct from old.premium_plan or new.premium_until is distinct from old.premium_until
  or new.verified_phone is distinct from old.verified_phone or new.verified_id is distinct from old.verified_id or new.verified_tax is distinct from old.verified_tax
 ) then raise exception 'Bu alan yalnızca sistem tarafından değiştirilebilir';end if;
 if new.phone is distinct from old.phone and current_user not in ('postgres','supabase_admin','supabase_auth_admin') then new.verified_phone:=false;end if;
 return new;
end $function$;

-- 2 = Firma Pro, 1 = Pro, 0 = ücretsiz
create or replace function public.premium_rank_of(p uuid) returns smallint
 language sql stable security definer set search_path = '' as $$
 select coalesce((select case when pr.is_premium and (pr.premium_until is null or pr.premium_until > now())
   then case pr.premium_plan when 'business' then 2 else 1 end else 0 end
   from public.profiles pr where pr.id = p), 0)::smallint
$$;
revoke execute on function public.premium_rank_of(uuid) from public, anon, authenticated;

-- Kullanıcı kendi satırında sıralama puanını değiştiremez; her yazımda sahibin üyeliğinden hesaplanır.
create or replace function public.set_post_premium_rank() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin new.premium_rank := public.premium_rank_of(new.owner_id); return new; end $$;
create or replace function public.set_provider_premium_rank() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin new.premium_rank := public.premium_rank_of(new.user_id); return new; end $$;
drop trigger if exists market_posts_premium_rank on public.market_posts;
create trigger market_posts_premium_rank before insert or update on public.market_posts
 for each row execute function public.set_post_premium_rank();
drop trigger if exists service_providers_premium_rank on public.service_providers;
create trigger service_providers_premium_rank before insert or update on public.service_providers
 for each row execute function public.set_provider_premium_rank();

create index if not exists market_posts_rank_idx on public.market_posts (kind, status, premium_rank desc, created_at desc);
create index if not exists service_providers_rank_idx on public.service_providers (published, premium_rank desc, created_at desc);

create or replace function public.sync_premium(p uuid) returns void
 language plpgsql security definer set search_path = '' as $$
begin
 update public.market_posts set premium_rank = public.premium_rank_of(p) where owner_id = p;
 update public.service_providers set premium_rank = public.premium_rank_of(p) where user_id = p;
end $$;
revoke execute on function public.sync_premium(uuid) from public, anon, authenticated;

-- Üyelik verme / uzatma / kapatma: yönetici, ödeme sunucusu (service_role) veya SQL konsolu.
create or replace function public.admin_set_premium(p_user uuid, p_plan text, p_months int default 1) returns timestamptz
 language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz;
begin
 if not (public.is_moderator() or coalesce(auth.role(), 'postgres') in ('service_role', 'postgres')) then
  raise exception 'Yetkisiz işlem';
 end if;
 if p_plan is null then
  update public.profiles set is_premium = false, premium_plan = null, premium_until = null where id = p_user;
  perform public.sync_premium(p_user);
  return null;
 end if;
 if p_plan not in ('pro', 'business') or p_months is null or p_months < 1 or p_months > 36 then
  raise exception 'Geçersiz tarife veya süre';
 end if;
 select greatest(coalesce(premium_until, now()), now()) + make_interval(months => p_months) into v_until
   from public.profiles where id = p_user;
 if v_until is null then raise exception 'Kullanıcı bulunamadı'; end if;
 update public.profiles set is_premium = true, premium_plan = p_plan, premium_until = v_until where id = p_user;
 perform public.sync_premium(p_user);
 return v_until;
end $$;
revoke execute on function public.admin_set_premium(uuid, text, int) from public, anon;
grant execute on function public.admin_set_premium(uuid, text, int) to authenticated, service_role;

create or replace function public.expire_premiums() returns int
 language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
 for r in update public.profiles set is_premium = false, premium_plan = null
   where is_premium and premium_until is not null and premium_until < now() returning id
 loop perform public.sync_premium(r.id); n := n + 1; end loop;
 return n;
end $$;
revoke execute on function public.expire_premiums() from public, anon, authenticated;

-- İlan limiti: ücretsiz 3, Pro 30, Firma Pro 100 (+ davet bonusu).
create or replace function public.enforce_listing_limit()
 returns trigger language plpgsql set search_path to 'public' as $function$
declare lim int; cnt int; bonus int;
begin
  if new.status not in ('active','paused') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active','paused') then return new; end if;
  select case when is_premium and premium_plan = 'business' then 100 when is_premium then 30 else 3 end into lim from profiles where id = new.seller_id;
  select least(3,count(*)) into bonus from public.referrals where inviter_id = new.seller_id and status = 'rewarded';
  select count(*) into cnt from listings
    where seller_id = new.seller_id and status in ('active','paused')
      and (tg_op = 'INSERT' or id <> new.id);
  if cnt >= coalesce(lim, 3) + coalesce(bonus, 0) then
    raise exception 'İlan limitine ulaştın (% ilan). Eski bir ilanı sil ya da satıldı olarak işaretle.', coalesce(lim, 3) + coalesce(bonus, 0);
  end if;
  return new;
end $function$;

-- Yapay zeka asistanı kullanım sayacı (aylık).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  used int not null default 0,
  primary key (user_id, month)
);
alter table public.ai_usage enable row level security;
drop policy if exists "own ai usage" on public.ai_usage;
create policy "own ai usage" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.ai_take_quota(p_user uuid) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_lim int; v_used int; v_month date := date_trunc('month', now())::date;
begin
 if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Yetkisiz işlem'; end if;
 select case when pr.is_premium and (pr.premium_until is null or pr.premium_until > now()) then coalesce(pr.premium_plan, 'pro') end
   into v_plan from public.profiles pr where pr.id = p_user;
 if v_plan is null then return jsonb_build_object('ok', false, 'reason', 'not_premium'); end if;
 v_lim := case v_plan when 'business' then 200 else 40 end;
 insert into public.ai_usage as u (user_id, month, used) values (p_user, v_month, 1)
   on conflict (user_id, month) do update set used = u.used + 1 where u.used < v_lim
   returning u.used into v_used;
 if v_used is null then return jsonb_build_object('ok', false, 'reason', 'quota', 'limit', v_lim, 'plan', v_plan); end if;
 return jsonb_build_object('ok', true, 'plan', v_plan, 'limit', v_lim, 'used', v_used);
end $$;
create or replace function public.ai_refund_quota(p_user uuid) returns void
 language plpgsql security definer set search_path = '' as $$
begin
 if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Yetkisiz işlem'; end if;
 update public.ai_usage set used = greatest(used - 1, 0) where user_id = p_user and month = date_trunc('month', now())::date;
end $$;
revoke execute on function public.ai_take_quota(uuid), public.ai_refund_quota(uuid) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid), public.ai_refund_quota(uuid) to service_role;

-- Süresi dolan üyelikleri saatte bir kapat.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'expire-premiums';
select cron.schedule('expire-premiums', '7 * * * *', $$select public.expire_premiums()$$);

-- Arama sıralaması (Öne çıkanlar): Firma Pro > Pro / öne çıkarılmış > diğerleri.
do $do$
declare d text;
begin
 select pg_get_functiondef('public.search_listings(jsonb,boolean)'::regprocedure) into d;
 if position('pr.is_premium,' in d) = 0 or position('(f.is_premium or coalesce(f.boosted_until>now(),false))::int' in d) = 0 or position('-''is_premium''' in d) = 0 then
  raise exception 'search_listings beklenen biçimde değil';
 end if;
 d := replace(d, 'pr.is_premium,', 'pr.is_premium,pr.premium_plan,pr.premium_until,');
 d := replace(d, '(f.is_premium or coalesce(f.boosted_until>now(),false))::int',
  '(case when f.is_premium and (f.premium_until is null or f.premium_until>now()) and f.premium_plan=''business'' then 2 when (f.is_premium and (f.premium_until is null or f.premium_until>now())) or coalesce(f.boosted_until>now(),false) then 1 else 0 end)');
 d := replace(d, '-''is_premium''', '-''is_premium''-''premium_plan''-''premium_until''');
 execute d;
end $do$;
