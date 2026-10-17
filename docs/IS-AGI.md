# Makinasal iş ağı

Satılık ilanlara ek, aynı Supabase Auth hesabını kullanan kiralık makine/kamyon, kiralık operatör, iş talebi ve parça talebi modülleri.

## Akışlar

- `/kiralik`, `/operatorler`, `/isler`, `/parca-talepleri`: il, kategori ve başlık filtreleri; sunucuda 24 kayıt sayfalama.
- `/is-agi/yeni`: ilan türü, kapsam, il/ilçe, isteğe bağlı açık harita koordinatları, tarih aralığı, miktar, bütçe/fiyat ve fiyat birimi. Kiralama ilanında ücret zorunlu.
- `/is-agi/ilan/:id`: ilan ayrıntıları; kiralamak isteyenin fiyat önerisi veya iş/parça sağlayıcısının teklifi; teklif düzenleme/geri çekme; ilan sahibinin seçme/reddetme; iki taraflı özel mesajlar.
- `/firmalar`: hizmet verilen ile, firma türüne ve iş alanına göre arama. Hafriyatçı, parçacı, operatör ve kiralama profilleri.
- `/firma-kaydi`: hesap başına bir hizmet profili; çoklu hizmet illeri ve faaliyetler; yayımdan gizleme.
- `/firmalar/:id`: firma konumu, hizmet bölgeleri ve açık ilanları; firmayı tercih ederek iş/parça talebi açma.
- `/is-agi/hesabim`: kendi ilanları, gelen/verilen teklifler ve firmadan istenen işler. En son 100 kayıt gösterilir.

Firma için açılan talep herkese açık olur. `preferred_provider` ilgili firmanın hesabında görünmesini sağlar. E-posta/push bildirimi gönderilmez. Teklif mesajları elle yenilenir; gerçek zamanlı bildirim iddiası yoktur.

## Veri ve yetki

Yeni tablolar: `market_posts`, `service_providers`, `market_quotes`, `market_quote_messages`. Tümünde RLS var. Anonim ziyaretçi yalnızca açık/yayımlanmış içerikleri ve kapalı ilanları okuyabilir. Kaldırılmış ilanları sahibi ile teklif vermiş katılımcıları görebilir. Fiyat teklifleri ve mesajlar yalnızca iki tarafça okunur. Firma konumu açıkça kullanıcı tarafından yayımlanır; özel hesap telefonu bu modülde açığa çıkarılmaz.

Teklif sahibi yalnızca bekleyen teklifini düzenleyebilir veya geri çekebilir. İlan sahibi yalnızca durumu değiştirebilir; karşı tarafın bedelini değiştiremez. Kimlik/sahiplik alanlarında UPDATE yetkisi verilmez. Gizli şemadaki tetikleyici gerçek ilan sahibini doğrular, kendi ilanına teklif verilmesini engeller ve ilan satırını kilitleyerek kapanma/seçim yarışlarını sıraya koyar. Kısmi benzersiz indeks aynı işe iki seçilmiş teklif verilmesini engeller. Sonuçlanmış teklifler değişmez. Silme yetkisi verilmez; ilan kaldırma durumu kullanılır.

Teklif seçimi ödeme, rezervasyon garantisi veya sözleşme oluşturmaz. Kullanıcılar kapsamı, KDV/yakıt/nakliye, tarih ve toplam bedeli mesajla netleştirir. Firma bilgileri kendi beyanıdır; otomatik doğrulanmış firma rozeti kullanılmaz.

## Uygulanan migrasyonlar

- `20261016212935_work_network.sql`
- `20261016213402_network_provider_requests.sql`
- `20261016213606_network_history_access.sql`

Bunlar mevcut satış, itibar ve moderasyon tablolarının davranışını değiştirmez. Önceki `20261016210353_production_moderation_and_stats.sql` hâlâ UYGULANMAMIŞTIR; bu iş kapsamında çalıştırılmadı. Tüm eski migrasyonları kontrolsüzce `db push` ile canlıya uygulamayın.

## Doğrulama

`supabase/tests/work_network.sql` gerçek veritabanında işlem içinde üç geçici test hesabıyla çalıştırılır ve sonunda ROLLBACK yapar; e-posta göndermez. Sahiplik sahteciliği, kendi ilanına teklif, üçüncü kişinin özel verileri görmesi/mesaj yazması, teklif verenin kendini seçmesi, iş sahibinin fiyat değiştirmesi, iki teklif seçilmesi, kapalı ilan düzenleme ve kaldırılmış ilan geçmişi kontrol edilir.

`npm test` tür/koordinat/fiyat birimi kontrolleri içerir. TypeScript ve Next üretim derlemesi geçti. Tarayıcı kontrol aracı bulunmadığından gerçek tarayıcı/telefon etkileşim testi yapılmadı. Canlı e-posta akışı ve genel kullanıma açılış koşulları önceki durum belgesindeki sınırlamalara tabidir. Sanayi ustaları modülü bu sürüme dahil değildir.

## Ana sayfa ve şirket filosu güncellemesi

Ana sayfa Satılık/Kiralık/İşler/Parçalar/Firmalar araması, ortak il seçimi, dört hızlı işlem, kişisel iş merkezi ve gerçek verilerle bölgesel içerikler içerir. İl tercihi tarayıcıda tutulur; konum izni istenmez. Aramaya q/city parametreleri aktarılır. Yükleme hataları boş sonuçlardan ayrı gösterilir; örnek ilan veya sahte istatistik eklenmez.

`/sirketler` şirket rehberidir. Firma profilindeki `company_category` alanı hafriyat/nakliye/kiralama/parça/diğer şirket sınıflandırmasını sağlar. Mevcut hafriyat, kiralama ve parçacı profilleri de rehberde gösterilir. `/envanterim` şirketin kendi ekipmanlarını yönetir. Marka, model, yıl, adet, kapasite, müsaitlik ve görünürlük belirtilir. `company_inventory` RLS ile sahibi dışındaki yazmalara kapalıdır. Hem ekipman hem şirket profili yayımlanmışsa ziyaretçiler okuyabilir. Şirket gizlenince envanter de gizlenir. Kayıtlar satış ilanı, mülkiyet doğrulaması veya rezervasyon oluşturmaz. Vitrin en son 200 ekipman grubunu gösterir ve toplamı yalnızca listelenen kayıtlar için hesaplar.

`20261016214341_company_inventory.sql` canlıya uygulandı. `supabase/tests/company_inventory.sql` iki geçici kullanıcı ile sahiplik, güncelleme/silme, görünürlük, hizmet ili ve adet kısıtlarını doğruladı; test verileri geri alındı. Ana sayfa arama URL testleri, TypeScript ve üretim derlemeleri doğrulamaya dahildir. Gerçek tarayıcı/telefon etkileşim testi bu ortamda yapılamadı.

## Kiralama kapsamı ve makine kataloğu

Yeni kiralık makine/araç ilanında `rental_mode` zorunludur: `with_operator` (operatörlü/şoförlü) veya `machine_only` (yalnız makine/araç). Kartlar, ana sayfa ve ayrıntı ekranı kapsamı gösterir; kiralık araması bu alana göre filtrelenir. Eski kayıtların bilinmeyen kapsamı NULL kalır ve açıkça belirtilmemiş gösterilir; kapanma/kaldırma engellenmez. Kiralama bedeli seçilen kapsama aittir, yakıt/nakliye/KDV açıklamada netleştirilir. İki farklı kapsam sunan şirket iki ayrı ilan açabilir. `20261016215642_rental_operator_options.sql` uygulanmıştır; yeni ilanlar için RLS INSERT kuralı kapsamı zorunlu tutar.

Ortak `MACHINE_CATEGORIES` kataloğu satış, kiralama, iş/parça ihtiyacı ve şirket envanterinde kullanılır. Manitou/teleskopik yükleyici, mobil/paletli/kule vinç, kazı/yükleme, beton, yol, sondaj, taşıma, enerji, tarım ve diğer makine grupları eklenmiştir. Listelenmeyen özel modeller “Diğer iş makinesi” altında başlık ve teknik özelliklerde belirtilebilir; tüm marka/model kombinasyonlarının hazır bulunduğu iddia edilmez. Eski kategori adları korunmuştur.

## Gruplu filtre ve marka kataloğu

75 makine türü ve iki parça kategorisi 20 ana başlıkta düzenlendi. Satılık filtrelerinde aranabilir, açılır kategori ağacı vardır; “Tüm ekskavatörler” gibi grup seçimi tüm alt türleri kapsar, tek tür seçimi yalnızca o türü kapsar. İlan/iş talebi/envanter formları aynı gruplu seçenekleri kullanır ve kayıtları eski kategori adlarıyla saklar; grup kimlikleri yalnız filtrede kullanılır.

Marka alanı seçilen makine ailesine göre öneriler, belirli alt türlerde daha dar listeler, marka içinde arama ve serbest giriş sunar. Katalog güncel ve tarihî marka/marka adlarını kapsar; evrensel tamlık veya her alt türün her marka tarafından bugün üretildiği garantisi değildir. Marka değişimi/aliasları için CAT–Caterpillar, Mercedes–Mercedes-Benz vb. eşleştirmeler vardır. Model alanı serbest bırakılmıştır. Eski kayıtlı aramalarda marka alanı olmaması filtreyi bozmaz.

İş ağı tablolarına opsiyonel `brand`/`model` alanları `20261016220823_machinery_brand_fields.sql` ile eklendi. Eski boş alanlar başlık metninden tahmin edilmedi; marka filtresi boş kayıtları dışarıda bırakır, eski ilanlar için genel başlık araması kullanılabilir. Katalog ve marka filtreleri mantık testleriyle, kayıt yetkileri `supabase/tests/machinery_brands.sql` ile doğrulanır.

Katalog oluşturulurken başvurulan kaynak örnekleri (ürün kapsamı ve güncel/ikinci el isimleri):
- https://www.cat.com/en_US/sitemap.html
- https://www.manitou.com/en-US/our-machines
- https://www.liebherr.com/en-us/mobile-and-crawler-cranes/mobile-and-crawler-cranes-4407715
- https://www.lectura-specs.com/en/specs/construction-machinery
- https://www.lectura-specs.com/en/specs/cranes
- https://www.lectura-specs.in/en-in/specs/forklifts/telehandlers
- https://www.lectura-specs.in/en-in/specs/transportation/trucks
- https://www.lectura-specs.com/en/specs/agricultural-machinery
