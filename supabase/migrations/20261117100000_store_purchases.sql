-- Uygulama içi satın alma (Apple App Store / Google Play, RevenueCat üzerinden).
-- RevenueCat her satın alma, yenileme, iptal ve süre bitiminde revenuecat-webhook fonksiyonunu çağırır;
-- fonksiyon olayı buraya kaydeder ve üyeliği mağazanın bildirdiği bitiş tarihine göre açar / kapatır.
create table if not exists public.store_events (
  id text primary key,                        -- RevenueCat olay kimliği (aynı olay iki kez işlenmez)
  user_id uuid references public.profiles (id) on delete set null,
  type text not null,
  product_id text,
  store text,
  environment text,
  expires_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists store_events_user_idx on public.store_events (user_id, created_at desc);
alter table public.store_events enable row level security;
revoke all on public.store_events from anon, authenticated;
-- Kullanıcı kendi mağaza işlemlerini görebilir (Ödemelerim); yazma yalnızca sunucu
grant select (id, user_id, type, product_id, store, expires_at, created_at) on public.store_events to authenticated;
drop policy if exists "kendi mağaza işlemlerim" on public.store_events;
create policy "kendi mağaza işlemlerim" on public.store_events for select to authenticated using (user_id = (select auth.uid()));

-- Mağazanın bildirdiği durumu profile yazar. p_until null ya da geçmişteyse üyelik kapanır.
create or replace function makinasal_private.set_store_premium(p_uid uuid, p_plan text, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare store_max timestamptz;
begin
  if p_uid is null then return; end if;
  if p_plan is null or p_until is null or p_until <= now() then
    -- Yalnızca mağazadan gelen üyelik kapatılır: profildeki bitiş, mağazanın şimdiye kadar bildirdiği en geç
    -- bitişten (1 gün pay ile) daha ileride değilse. Yöneticinin elle verdiği daha uzun süre korunur.
    select max(expires_at) into store_max from public.store_events where user_id = p_uid;
    update public.profiles set is_premium = false, premium_plan = null, premium_until = null
     where id = p_uid and (premium_until is null or premium_until <= coalesce(store_max, now()) + interval '1 day');
  else
    if p_plan not in ('pro', 'business') then raise exception 'BAD_PLAN'; end if;
    update public.profiles set is_premium = true, premium_plan = p_plan, premium_until = p_until where id = p_uid;
  end if;
  perform public.sync_premium(p_uid);
end $$;
revoke all on function makinasal_private.set_store_premium(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.set_store_premium(p_uid uuid, p_plan text, p_until timestamptz)
returns void language sql security definer set search_path = '' as $$
  select makinasal_private.set_store_premium(p_uid, p_plan, p_until);
$$;
revoke all on function public.set_store_premium(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.set_store_premium(uuid, text, timestamptz) to service_role;
grant execute on function makinasal_private.set_store_premium(uuid, text, timestamptz) to service_role;
