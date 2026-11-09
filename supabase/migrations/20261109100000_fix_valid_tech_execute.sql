-- HATA DÜZELTMESİ: listings_tech_check kısıtı makinasal_private.valid_tech() işlevini çağırır.
-- Kısıt, satırı yazan kullanıcının yetkisiyle çalıştığı için işlevin EXECUTE yetkisi olmadan
-- normal üyeler ilan ekleyemiyor / düzenleyemiyordu ("permission denied for function valid_tech").
-- İşlev yalnızca doğrulama yapar (veri okumaz); şema API'ye açık olmadığı için dışarıdan çağrılamaz.
grant execute on function makinasal_private.valid_tech(jsonb) to authenticated, service_role;
