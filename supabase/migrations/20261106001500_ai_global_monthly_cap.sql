-- Yapay zeka asistanı: tüm kullanıcılar için aylık toplam soru sınırı (maliyet güvenliği).
create or replace function public.ai_take_quota(p_user uuid) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_lim int; v_used int; v_month date := date_trunc('month', now())::date;
  v_global_cap constant int := 10000; -- tüm kullanıcılar için aylık toplam soru (yaklaşık 8-9 $ üst sınır)
begin
 if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Yetkisiz işlem'; end if;
 select case when pr.is_premium and (pr.premium_until is null or pr.premium_until > now()) then coalesce(pr.premium_plan, 'pro') end
   into v_plan from public.profiles pr where pr.id = p_user;
 if v_plan is null then return jsonb_build_object('ok', false, 'reason', 'not_premium'); end if;
 if (select coalesce(sum(used), 0) from public.ai_usage where month = v_month) >= v_global_cap then
   return jsonb_build_object('ok', false, 'reason', 'global_limit');
 end if;
 v_lim := case v_plan when 'business' then 200 else 40 end;
 insert into public.ai_usage as u (user_id, month, used) values (p_user, v_month, 1)
   on conflict (user_id, month) do update set used = u.used + 1 where u.used < v_lim
   returning u.used into v_used;
 if v_used is null then return jsonb_build_object('ok', false, 'reason', 'quota', 'limit', v_lim, 'plan', v_plan); end if;
 return jsonb_build_object('ok', true, 'plan', v_plan, 'limit', v_lim, 'used', v_used);
end $$;
revoke execute on function public.ai_take_quota(uuid) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid) to service_role;
create index if not exists ai_usage_month_idx on public.ai_usage (month);
