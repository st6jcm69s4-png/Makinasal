-- Gizlilik (18 Kasım 2026): üyelik bitiş tarihi ve şikayet sayısı artık herkese açık değil.
-- 1) Şikayet sayısı yerine yalnızca "işaretli" (2 ve üzeri doğrulanmış şikayet) bilgisi açık; güven etiketi bununla hesaplanır.
alter table public.user_stats_summary add column if not exists flagged boolean generated always as (coalesce(reports, 0) >= 2) stored;

revoke all on public.user_stats_summary from anon, authenticated;
grant select (id, score, review_count, deals, flagged, seller_score, seller_reviews, buyer_score, buyer_reviews)
  on public.user_stats_summary to anon, authenticated;

drop view if exists public.user_stats;
create view public.user_stats with (security_invoker = true) as
  select id, score, review_count, deals, flagged, seller_score, seller_reviews, buyer_score, buyer_reviews
  from public.user_stats_summary;
revoke all on public.user_stats from anon, authenticated;
grant select on public.user_stats to anon, authenticated;

-- 2) Üyelik bitiş tarihi: yalnızca kişinin kendisi ve yönetici görür (profile_plans). Rozet için etkin tarife herkese açık.
create or replace function public.profile_plans(p_ids uuid[])
returns table (id uuid, plan text, until timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id,
         case when p.is_premium and (p.premium_until is null or p.premium_until > now())
              then case when p.premium_plan = 'business' then 'business' else 'pro' end end,
         case when p.id = (select auth.uid()) or public.is_moderator() then p.premium_until end
  from public.profiles p
  where p.id = any (p_ids[1:200]);
$$;
revoke all on function public.profile_plans(uuid[]) from public;
grant execute on function public.profile_plans(uuid[]) to anon, authenticated;

revoke select (premium_until) on public.profiles from anon, authenticated;

-- Etkin tarife sırası (0 / 1 / 2) zaten rozetle herkese açık; arama bunu kullanır
grant execute on function public.premium_rank_of(uuid) to anon, authenticated;

-- 3) Arama, gizlenen sütunları okumadan çalışsın (sıralama premium_rank_of ile, risk filtresi flagged ile)
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'search_listings';
  if position('pr.premium_until' in d) = 0 then return; end if;
  d := replace(d, 's.reports,pr.is_premium,pr.premium_plan,pr.premium_until,', 's.flagged,public.premium_rank_of(pr.id) prank,');
  d := replace(d, 'coalesce(s.reports,0)>=2', 'coalesce(s.flagged,false)');
  d := replace(d, '(case when f.is_premium and (f.premium_until is null or f.premium_until>now()) and f.premium_plan=''business'' then 2 when (f.is_premium and (f.premium_until is null or f.premium_until>now())) or coalesce(f.boosted_until>now(),false) then 1 else 0 end)',
                  '(case when f.prank=2 then 2 when f.prank=1 or coalesce(f.boosted_until>now(),false) then 1 else 0 end)');
  d := replace(d, '-''deals''-''reports''-''is_premium''-''premium_plan''-''premium_until''-''distance''', '-''deals''-''flagged''-''prank''-''distance''');
  if position('premium_until' in d) > 0 or position('reports' in d) > 0 then
    raise exception 'search_listings dönüşümü tamamlanamadı';
  end if;
  execute d;
end $$;
