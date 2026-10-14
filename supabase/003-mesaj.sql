-- 003: Mesaj uzunluğu sınırı (schema.sql ve 002'den sonra bir kez çalıştırın)
alter table messages
  add constraint messages_body_len check (char_length(btrim(body)) between 1 and 2000);
