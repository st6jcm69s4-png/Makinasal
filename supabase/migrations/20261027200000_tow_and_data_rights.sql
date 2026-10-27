-- Çekici / yol yardım hizmeti, firma telefonu ve KVKK veri hakları talepleri.

alter table public.service_providers drop constraint service_providers_kind_check;
alter table public.service_providers add constraint service_providers_kind_check check (kind in ('excavation','supplier','operator','rental','tow'));
alter table public.service_providers drop constraint service_providers_company_category_check;
alter table public.service_providers add constraint service_providers_company_category_check
  check (company_category in ('Hafriyat şirketi','Nakliye şirketi','Makine kiralama şirketi','Parça tedarikçisi','Çekici / yol yardım','Diğer şirket'));

-- Yayındaki firmanın telefonunu yalnızca giriş yapmış kullanıcı görür (ilan telefonuyla aynı kural).
create or replace function public.provider_phone(p_provider uuid) returns text
language plpgsql security definer set search_path='' as $$
declare ph text;
begin
 if auth.uid() is null then raise exception 'Telefonu görmek için giriş yapmalısın'; end if;
 select p.phone into ph from public.service_providers s join public.profiles p on p.id=s.user_id
 where s.user_id=p_provider and s.published;
 return ph;
end $$;
revoke all on function public.provider_phone(uuid) from public, anon;
grant execute on function public.provider_phone(uuid) to authenticated;

-- KVKK madde 11 başvuruları: bilgi/aktarım, düzeltme, silme, itiraz. Talepler yönetimde 30 gün içinde yanıtlanır.
create table public.data_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('export','correct','delete','object')),
 note text not null default '' check (length(note)<=1000),
 status text not null default 'open' check (status in ('open','done','rejected')),
 created_at timestamptz not null default now(),
 handled_at timestamptz
);
create unique index data_requests_one_open on public.data_requests(user_id,kind) where status='open';
alter table public.data_requests enable row level security;
revoke all on public.data_requests from anon, authenticated;
grant select on public.data_requests to authenticated;
grant insert(kind,note) on public.data_requests to authenticated;
grant update(status,handled_at) on public.data_requests to authenticated;
create policy "own requests read" on public.data_requests for select to authenticated using (user_id=auth.uid() or public.is_moderator());
create policy "own requests insert" on public.data_requests for insert to authenticated with check (user_id=auth.uid());
create policy "moderator handles requests" on public.data_requests for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
