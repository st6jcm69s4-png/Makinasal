-- Makine karnesi: satıcının ilana eklediği bakım kayıtları (tarih, saat/km, yapılan iş).
-- Herkes okuyabilir (yalnızca görebildiği ilanların kayıtlarını); yalnızca ilan sahibi ekler ve siler.
create table if not exists public.listing_service_logs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  seller_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  done_on date not null check (done_on >= date '1980-01-01'),
  usage_value integer check (usage_value between 0 and 9999999),
  -- 7+ haneli sayı (telefon) yazılamaz
  work text not null check (char_length(btrim(work)) between 3 and 300 and work !~ '\d{7,}'),
  created_at timestamptz not null default now()
);
create index if not exists listing_service_logs_listing_idx on public.listing_service_logs (listing_id, done_on desc);
create index if not exists listing_service_logs_seller_idx on public.listing_service_logs (seller_id);

alter table public.listing_service_logs enable row level security;
revoke all on public.listing_service_logs from anon, authenticated;
grant select on public.listing_service_logs to anon, authenticated;
grant insert, delete on public.listing_service_logs to authenticated;

create policy "karne okuma" on public.listing_service_logs for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "karne ekleme" on public.listing_service_logs for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and done_on <= current_date + 1
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid()))
  );
create policy "karne silme" on public.listing_service_logs for delete to authenticated
  using (seller_id = (select auth.uid()));

-- İlan başına en çok 50 kayıt
create or replace function makinasal_private.service_log_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.listing_service_logs x where x.listing_id = new.listing_id) >= 50 then
    raise exception 'Bir ilana en fazla 50 bakım kaydı eklenebilir';
  end if;
  return new;
end $$;
revoke all on function makinasal_private.service_log_limit() from public, anon, authenticated;
drop trigger if exists service_log_limit on public.listing_service_logs;
create trigger service_log_limit before insert on public.listing_service_logs
  for each row execute function makinasal_private.service_log_limit();
