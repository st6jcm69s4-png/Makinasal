-- 004: İki taraf satışı onaylayınca ilan otomatik "satıldı" olur (002 ve 003'ten sonra bir kez çalıştırın)
create function mark_listing_sold() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.completed_at is not null and (tg_op = 'INSERT' or old.completed_at is null) then
    update listings set status = 'sold'
    where id = (select listing_id from threads where id = new.thread_id)
      and status in ('active', 'paused');
  end if;
  return new;
end $$;
create trigger deals_mark_sold after insert or update on deals
  for each row execute function mark_listing_sold();
revoke execute on function mark_listing_sold() from public, anon, authenticated;

-- Daha önce tamamlanmış satışların ilanlarını da düzelt
update listings set status = 'sold'
where status in ('active', 'paused')
  and id in (select t.listing_id from threads t join deals d on d.thread_id = t.id where d.completed_at is not null);
