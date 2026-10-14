-- 004: İki taraf da satışı onaylayınca ilan otomatik "satıldı" olur (schema.sql, 002, 003'ten sonra bir kez çalıştırın)
create or replace function guard_deal() returns trigger language plpgsql security definer set search_path=public as $$
declare t threads;
begin
  select * into t from threads where id=new.thread_id;
  if tg_op='INSERT' then
    if auth.uid()=t.buyer_id then new.seller_confirmed:=false; else new.buyer_confirmed:=false; end if;
    new.completed_at:=null;
  else
    if auth.uid()<>t.buyer_id then new.buyer_confirmed:=old.buyer_confirmed; end if;
    if auth.uid()<>t.seller_id then new.seller_confirmed:=old.seller_confirmed; end if;
    new.thread_id:=old.thread_id;
    new.completed_at:=old.completed_at;
  end if;
  if new.buyer_confirmed and new.seller_confirmed and new.completed_at is null then
    new.completed_at:=now();
    update listings set status='sold' where id=t.listing_id and status in ('active','paused');
  end if;
  return new;
end $$;

-- Daha önce tamamlanmış satışların ilanlarını da düzelt
update listings l set status='sold'
from threads t join deals d on d.thread_id=t.id
where t.listing_id=l.id and d.completed_at is not null and l.status in ('active','paused');
