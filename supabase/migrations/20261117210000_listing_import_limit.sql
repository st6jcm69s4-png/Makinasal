-- İlan aktarma (ekran görüntüsünden): kişi başına günde 15 aktarma. Yalnızca sunucu fonksiyonu (listing-import) çağırır.
create or replace function public.import_take_limit(p_uid uuid)
returns boolean language sql security definer set search_path = '' as $$
  select makinasal_private.take_limit('import:' || p_uid::text, 15, 86400);
$$;
revoke all on function public.import_take_limit(uuid) from public, anon, authenticated;
grant execute on function public.import_take_limit(uuid) to service_role;

-- Yapay zeka hata verirse kullanılan hak geri verilir
create or replace function public.import_refund_limit(p_uid uuid)
returns void language sql security definer set search_path = '' as $$
  update makinasal_private.request_buckets set hits = greatest(hits - 1, 0) where key = 'import:' || p_uid::text;
$$;
revoke all on function public.import_refund_limit(uuid) from public, anon, authenticated;
grant execute on function public.import_refund_limit(uuid) to service_role;
