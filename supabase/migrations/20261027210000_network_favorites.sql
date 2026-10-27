-- İş ağı favorileri: ilanlar (post) ve firmalar (firm). Kullanıcı başına en fazla 300.
create table public.network_favorites (
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('post','firm')),
 ref_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (user_id, kind, ref_id)
);
create index network_favorites_user on public.network_favorites(user_id, created_at desc);
alter table public.network_favorites enable row level security;
revoke all on public.network_favorites from anon, authenticated;
grant select, delete on public.network_favorites to authenticated;
grant insert(kind, ref_id) on public.network_favorites to authenticated;
create policy "own network favorites read" on public.network_favorites for select to authenticated using (user_id = auth.uid());
create policy "own network favorites delete" on public.network_favorites for delete to authenticated using (user_id = auth.uid());
create policy "own network favorites insert" on public.network_favorites for insert to authenticated
 with check (user_id = auth.uid() and (select count(*) from public.network_favorites f where f.user_id = auth.uid()) < 300);
