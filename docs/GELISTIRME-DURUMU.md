# Geliştirme durumu — 5 Kasım 2026

## Moderasyon, itibar ve RPC güvenliği

Canlı Supabase geçmişinde `20261018210606 production_moderation_and_stats` kayıtlı. Canlı `public.user_stats` görünümü `security_invoker=true` ile çalışıyor ve herkese açık, salt okunur `user_stats_summary` tablosunu kullanıyor. Aşağıdaki 16 Ekim notları o tarihteki durumu anlatıyor.

Yeni [migration](../supabase/migrations/20261105174605_harden_moderation_reputation_and_rpcs.sql) mevcut özet mimarisini koruyor. Riskler olası etkilerine göre sıralandı. Testleri, örnek veritabanında [rollback ile çalışan regresyon dosyasından](../supabase/tests/moderation_reputation_rpcs.sql) çalıştırın.

| Öncelik | Risk ve kaynak | En küçük güvenli test |
| --- | --- | --- |
| Yüksek | `schema.sql` içindeki `guard_deal` rolü istemcinin önerdiği konuşmadan seçebiliyordu. Tek taraf karşı tarafın onayını taklit ederek ilanı satıldı işaretleyebilir ve itibar sayaçlarını etkileyebilirdi. | Aynı kullanıcının farklı rollerde olduğu iki konuşma oluştur. İlk anlaşmayı güncellerken ikinci konuşmanın kimliğini ver. Karşı tarafın onayı, tamamlanma zamanı ve itibar sayısı değişmemeli. Gerçek ikinci onaydan sonra özet artmalı. |
| Yüksek | `20261018211119_respect_moderation_in_contact_and_notifications.sql` içindeki `listing_phone` hesap kotası olmadan numara döndürüyor ve tekrar çağrıları sayıyordu. | Onaylı bir ilanda ilk 20 çağrı başarılı ve sayaç artışı bir olmalı. 21. çağrı başka ilanla da 429 dönmeli. Günlük sayaç 100 iken yeni dakika aynı şekilde engellenmeli. Bekleyen ilan ve anonim Auth hesabı numara alamamalı. |
| Orta | `20261016210353_production_moderation_and_stats.sql` rapor alanlarını daraltan bir sütun grant'i ekliyordu, fakat varsayılan tablo UPDATE yetkisi kalabiliyordu. `schema.sql` içindeki konuşma politikası da moderatörün görebildiği bekleyen ilana konuşma açmasına izin veriyordu. | Moderatör bekleyen ilana konuşma açamamalı. Raporu doğrulayabilmeli ve `reason` sütununu güncelleyememeli. |
| Orta | `005-ozellikler.sql` içindeki `mark_thread_read` her çağrıda satır yazıyor ve itibar tetikleyicisini çalıştırıyordu. | Yabancı bir hesap iki zaman damgasını da değiştirememeli. Katılımcı yalnız kendi damgasını ilerletmeli ve aynı çağrıyı tekrar etmek yeni satır sürümü üretmemeli. |
| Orta | `20261018204256_server_search_and_abuse_guards.sql` içindeki `track_view` tekil görüntüleme ve hesap kotası uyguluyor, fakat reddedilen istekler limit satırını yeniden yazıyordu. | Aynı ilanı 120 kez çağır, sonra ikinci ilana geç. İlk ilan bir kez sayılmalı. İkinci ilan, kendi ilanı ve bekleyen ilan sayılmamalı. |
| Düşük | `005-ozellikler.sql` içindeki `my_phone` yalnız çağıranın numarasını okuyordu. Özel sütun için sabit arama yolu ve açık erişim testi eklendi. | Girişli hesap yalnız kendi numarasını almalı. Başka profilin telefon sütununa doğrudan SELECT izni ve anonim role RPC izni verilmemeli. |
| Düşük | `user_stats` özel anlaşma ve şikayetlerden türetilen toplamları yayımlıyor. Özetin doğruluğu ve dayanak satırların gizliliği birlikte doğrulanmalı. | Bir anlaşma ve bir doğrulanmış şikayet oluştur. Ziyaretçi ve üçüncü hesap aynı özeti görmeli. Üçüncü hesap dayanak anlaşmayı okuyamamalı, ziyaretçi özeti güncelleyememeli. |

Telefon açma kotası hesap başına dakikada 20, günde 100 başarılı açmadır. Aynı hesap ve ilan bir 24 saatlik pencerede sayaçta bir kez görünür. `my_phone` için ayrı kota eklenmedi çünkü hedef almayan, yazma yapmayan bir hesap okuması. Okundu çağrısı için sayısal kota yerine yeni bir gelen mesaj bulunması şartı kullanıldı.

Yeni migration için canlı ve repo sürüm numaraları farklı. Önce uzak migration geçmişiyle eşleştirin ve yalnız yeni SQL'i hedef ortamda uygulayın. Canlı geçmişteki eski migration'ları yeniden çalıştırmayın.

## 16 Ekim 2026 kaydı

## Tamamlanan geliştirmeler
- Mevcut Supabase sorgu geri dönüşlerinin TypeScript hataları giderildi; üretim derlemesi açıldı.
- Oturum olayında API çağrıları sonraki görev kuyruğuna alındı; Supabase auth kilitlenmesi önlendi.
- E-posta onayı için PKCE callback, şifremi unuttum ve yeni şifre belirleme sayfası eklendi.
- Callback yalnızca aynı site içindeki güvenli yollara yönlendirir; oturum yanıtı önbelleğe alınmaz.
- Girişsiz ilan düzenleme bağlantısındaki sonsuz yükleme giderildi; fiyat, yıl, kullanım ve adet doğrulaması güçlendirildi.
- Gerçek ilan fiyat istatistikleri demo fiyatlarını dışlar.
- Mesaj yükleme hataları ve kayıtlı arama kaydetme/silme hataları kullanıcıya gösterilir.
- Hata/404 sayfaları, klavyeyle ana içeriğe geçiş ve azaltılmış hareket desteği eklendi.
- Mobil ana ekran için web manifesti ve uygulama simgesi eklendi. Bu bir native iOS/Android uygulaması veya çevrimdışı çalışma desteği değildir.
- Paket sürümleri sabitlendi; lockfile ve GitHub Actions test/build kontrolü eklendi.
- Fotoğraf kaydı sırasında ilan duraklatılır; tüm fotoğraflar tamamlanınca yayınlanır. Hata ekranından mevcut ilan düzenlenir, ikinci bir ilan oluşturulmaz.
- İlan kaldırma, konuşma ve değerlendirmeleri koruyan `removed` durumunu kullanır; veritabanında API rollerinin kalıcı silme yetkisi kaldırılır.
- Bağlantı hataları boş sonuçtan ayrılır; ilan detayında yanlış bulunamadı durumu ve oturum değişiminde eski yanıtların yeni hesabı ezmesi önlenir.
- Canlı Supabase'de dahili `rls_auto_enable()` fonksiyonunun API rollerine yürütme izni kaldırıldı; advisor tekrar çalıştırıldı.

## Doğrulama
- `npm test`: güven seviyesi, fiyat, mesaj filtresi, güvenli callback yolları ve demo/gerçek fiyat ayrımı.
- `npm run typecheck`: başarılı.
- `npm run build`: başarılı.
- Public tablolarda RLS kapalı tablo sayısı: 0.
- E-posta teslimi ve gerçek kullanıcıyla şifre yenileme uçtan uca denenmedi; gerçek kullanıcıya e-posta gönderilmedi.
- Tarayıcıda görsel QA ve canlı hosting dağıtımı henüz doğrulanmadı.

## Tamamlanması gereken işler
1. Hosting alan adını ve Supabase Auth URL ayarlarını eşleştir: `<site-origin>/auth/callback` yönlendirmesine izin ver. SMTP teslimatını, kayıt ve şifre sıfırlamayı test hesaplarıyla doğrula.
2. `public.user_stats` mevcutta sahip yetkisiyle çalışan bir toplulaştırma görünümü. Sadece `security_invoker` açmak, özel anlaşma/şikayet RLS'si nedeniyle diğer satıcıların güven istatistiğini yanlış hesaplatır. Public özet tablo + özel güncelleme mekanizmasına geçiş ve rol bazlı test gerekir. Mevcut görünüm bu turda değiştirilmedi.
3. Supabase sızdırılmış şifre koruması kapalı; plan/ayar uygunluğuna göre etkinleştir.
4. `track_view`, `listing_phone`, `my_phone`, `mark_thread_read` ayrıcalıklı RPC'leri veri erişimi, oran sınırı ve kötüye kullanım açısından test et. Telefon erişiminde oturum kontrolü var; sayaçta kötüye kullanım sınırı henüz yok.
5. Fotoğraf akışı için tarayıcı entegrasyon testlerini tamamla; depolama kesintisinde sahipsiz dosya temizliğini sunucudan otomatikleştir. Duraklatılmış ilanlara doğrudan URL erişimi mevcut RLS ile mümkündür; bu durum bir özel taslak saklama alanı değildir.
6. Admin moderasyonu, rapor inceleme, spam sınırları ve gerçek kullanıcı senaryoları için entegrasyon testlerini tamamla.
7. Premium ödeme, SMS/kimlik doğrulaması ve native mobil uygulama henüz uygulanmadı. Sağlayıcı seçimi, hesapları ve yayın ayarları gerekir.

## Veritabanı sürümleme
`supabase/schema.sql` ve 002–005 dosyaları eski başlangıç kurulumudur. Yeni `migrations/` dosyası bunların yerine bir tam kurulum değildir; var olan şema üzerinde uygulanır. Canlıya aynı değişikliği tekrar basmadan önce uzak migration geçmişini kontrol et.

## Kapsam
Bu kayıt ilk sağlamlaştırma paketidir. Tüm özelliklerin tamamlandığı veya sitenin yeni sürümünün yayınlandığı anlamına gelmez.


## Üretim beta hazırlığı — ikinci paket
- Demo verileri varsayılan olarak kapatıldı; istenirse `NEXT_PUBLIC_DEMO_MODE=true` ile yalnızca tanıtım ortamında açılır.
- Kayıtlı aramalar artık şehir, fiyat, yıl, kullanım, güven ve diğer filtreleriyle yeniden açılır. Paylaşılabilir URL ve 24 sonuçluk sayfalama eklendi.
- Varsayılan fiyat filtresinin pahalı makineleri gizlemesi düzeltildi.
- Genel çevrimdışı ekranı, gerçek PNG simgeleri, manifest ve telefona ekleme rehberi eklendi. Özel veri önbelleğe alınmaz; bu davranış birim testinde kontrol edilir.
- İlan detayına sunucu tarafından başlık/açıklama ve başlangıç verisi eklendi.
- Yardım merkezi hazırlandı; örnek ücret ve sınırsız paket vaatleri kaldırıldı.
- Moderasyon ekranı ve buna ilişkin SQL değişikliği hazırlandı, ancak canlı migration otomatik güvenlik incelemesinde reddedildi. Yeni moderasyon yetkileri ve public itibar özetleri veritabanına uygulanmadı; yönetim akışı kullanıma hazır kabul edilmemeli.
- Sites test yayını yalnızca hesap sahibine açık hazırlanıyor. Genel lansman, gerçek kullanıcı/e-posta ve cihaz testleri tamamlanmış sayılmaz.


## Menü ve gezinme düzeltmesi
- Yatay menü yerine soldan açılan, klavye ile kapatılabilen panel eklendi. Temel açma/kapama native details/summary ile JavaScript öncesinde de çalışır.
- Sayfa bağlantıları standart HTML bağlantıları kullanır; sayfa geçişi istemci yönlendiricisine bağımlı değildir.
- Telefona yükle bağlantıları ve tanıtım ekranı kaldırıldı; eski `/uygulama` adresi ana sayfaya yönlenir.
- Canlı veritabanı için onay bekleyen migration bu arayüz düzenlemesinde uygulanmadı.
