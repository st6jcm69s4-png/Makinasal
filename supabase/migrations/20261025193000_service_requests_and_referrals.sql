-- Hizmet talepleri (finansman / nakliye / ekspertiz) ve davet sistemi.
-- Talepler yalnızca toplanır; ortak firmalara otomatik iletim yoktur.
create table public.service_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 listing_id uuid references public.listings(id) on delete set null,
 kind text not null check(kind in('finans','nakliye','ekspertiz')),
 note text check(note is null or char_length(note)<=500),
 city text check(city is null or char_length(city)<=60),
 status text not null default 'new' check(status in('new','contacted','closed')),
 created_at timestamptz not null default now()
);
create unique index service_requests_open on public.service_requests(user_id,coalesce(listing_id,'00000000-0000-0000-0000-000000000000'::uuid),kind) where status='new';
alter table public.service_requests enable row level security;
revoke all on public.service_requests from public,anon,authenticated;
grant select on public.service_requests to authenticated;
grant insert(listing_id,kind,note,city) on public.service_requests to authenticated;
grant update(status) on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
create policy service_requests_select on public.service_requests for select to authenticated using(user_id=(select auth.uid()) or public.is_moderator());
create policy service_requests_insert on public.service_requests for insert to authenticated with check(user_id=(select auth.uid()));
create policy service_requests_moderate on public.service_requests for update to authenticated using(public.is_moderator()) with check(public.is_moderator());
alter table public.service_requests alter column user_id set default auth.uid();
create trigger guard_write_rate before insert on public.service_requests for each row execute function makinasal_private.guard_write_rate();

create table public.referral_codes(user_id uuid primary key references public.profiles(id) on delete cascade,code text not null unique,created_at timestamptz not null default now());
alter table public.referral_codes enable row level security;
revoke all on public.referral_codes from public,anon,authenticated;
grant all on public.referral_codes to service_role;
create table public.referrals(
 invitee_id uuid primary key references public.profiles(id) on delete cascade,
 inviter_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','rewarded')),
 created_at timestamptz not null default now(),rewarded_at timestamptz,
 check(invitee_id<>inviter_id)
);
create index referrals_inviter on public.referrals(inviter_id);
alter table public.referrals enable row level security;
revoke all on public.referrals from public,anon,authenticated;
grant select(inviter_id,invitee_id,status,created_at) on public.referrals to authenticated;
grant all on public.referrals to service_role;
create policy referrals_participants on public.referrals for select to authenticated using((select auth.uid()) in(inviter_id,invitee_id));

create function public.my_referral_code() returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();c text;i int:=0;
begin
 if me is null then raise exception 'Giriş gerekli';end if;
 select code into c from public.referral_codes where user_id=me;
 if found then return c;end if;
 loop
  i:=i+1;c:=upper(substr(md5(random()::text||clock_timestamp()::text||me::text),1,8));
  begin insert into public.referral_codes(user_id,code) values(me,c);return c;
  exception when unique_violation then
   select code into c from public.referral_codes where user_id=me;if found then return c;end if;
   if i>5 then raise exception 'Kod üretilemedi';end if;
  end;
 end loop;
end $$;
revoke all on function public.my_referral_code() from public,anon;
grant execute on function public.my_referral_code() to authenticated;

create function public.claim_referral(p_code text) returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();inv uuid;
begin
 if me is null then raise exception 'Giriş gerekli';end if;
 if not makinasal_private.take_limit('claim_referral:'||me::text,5,3600) then raise exception using errcode='23514',message='RATE_LIMIT: Çok fazla deneme. Daha sonra tekrar dene.';end if;
 select user_id into inv from public.referral_codes where code=upper(btrim(coalesce(p_code,'')));
 if inv is null then raise exception 'Davet kodu geçersiz';end if;
 if inv=me then raise exception 'Kendi davet kodunu kullanamazsın';end if;
 if exists(select 1 from public.referrals where invitee_id=me) then raise exception 'Zaten bir davet kodu kullandın';end if;
 if exists(select 1 from public.listings where seller_id=me and moderation_status='approved') then raise exception 'Davet kodu yalnızca ilk onaylı ilandan önce kullanılabilir';end if;
 insert into public.referrals(invitee_id,inviter_id) values(me,inv);
 return 'ok';
end $$;
revoke all on function public.claim_referral(text) from public,anon;
grant execute on function public.claim_referral(text) to authenticated;

-- Davet edilenin ilk onaylı ilanı: davet edene +1 ilan hakkı (en fazla 3 ödül).
create function makinasal_private.reward_referral() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.referrals;
begin
 if new.moderation_status='approved' and old.moderation_status is distinct from 'approved' then
  select * into r from public.referrals where invitee_id=new.seller_id and status='pending' for update;
  if found and (select count(*) from public.referrals where inviter_id=r.inviter_id and status='rewarded')<3 then
   update public.referrals set status='rewarded',rewarded_at=now() where invitee_id=r.invitee_id;
  end if;
 end if;
 return new;
end $$;
revoke all on function makinasal_private.reward_referral() from public,anon,authenticated;
create trigger reward_referral after update of moderation_status on public.listings for each row execute function makinasal_private.reward_referral();

create or replace function public.enforce_listing_limit() returns trigger language plpgsql set search_path='public' as $$
declare lim int; cnt int; bonus int;
begin
  if new.status not in ('active','paused') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('active','paused') then return new; end if;
  select case when is_premium then 30 else 3 end into lim from profiles where id = new.seller_id;
  select least(3,count(*)) into bonus from public.referrals where inviter_id = new.seller_id and status = 'rewarded';
  select count(*) into cnt from listings
    where seller_id = new.seller_id and status in ('active','paused')
      and (tg_op = 'INSERT' or id <> new.id);
  if cnt >= coalesce(lim, 3) + coalesce(bonus, 0) then
    raise exception 'İlan limitine ulaştın (% ilan). Eski bir ilanı sil ya da satıldı olarak işaretle.', coalesce(lim, 3) + coalesce(bonus, 0);
  end if;
  return new;
end $$;
