# 18 Ekim 2026 — Canlıya hazırlık düzeltmeleri

## Tamamlanan ve uygulanan

- Genel ilan araması `search_listings` RPC üzerinden veritabanında filtrelenir, sayılır, sıralanır ve 24 kayıtla sayfalanır. Ana sayfanın son 300 ilanı artık arama kaynağı değildir. Ana sayfadaki kısa keşif havuzu korunmuştur.
- Kategori grupları, marka eş adları (CAT/Caterpillar vb.), şehir, fiyat, yıl, kullanım birimi/aralığı, satıcı puanı, doğrulama, risk, takas ve şehir merkezi uzaklığı korunur. Kullanıcı araması SQL metnine eklenmez; `%` ve `_` düz karakter olarak aranır. Eşit sıralamalar `created_at,id` ile kararlıdır.
- Kayıtlı aramaların toplam/yeni sayıları tüm aktif ilanlardan ayrı count sorgularıyla alınır. Sayı alınamadığında sıfır sonuç iddiası yerine bilinmiyor metni gösterilir. Yanıtı geciken eski sorgular sonuçları değiştiremez.
- Aramada bulunan eski ilanlar kart, favori ve karşılaştırmada kullanılabilir; görünür kartların satıcı bilgileri ayrıca yüklenir.
- `robots.txt`, parçalı `sitemap.xml` ve 1.000 URL'lik alt haritalar eklendi. Sabit sayfalarda açıklama/canonical/OG, özel hesap sayfalarında noindex; ilanlarda Product/Offer JSON-LD ve mağazalarda dinamik metadata var. JSON-LD ve XML kaçışları uygulanır. Site özel beta olduğundan `PUBLIC_INDEXING_ENABLED` varsayılan kapalıdır. Paylaşım erişimi değiştirilmedi.
- `/hukuki` altında KVKK, kullanım, çerez ve satış/ödeme inceleme taslakları; çerez tercihi Ayarlar ve altbilgide. Bunlar avukat onaylı nihai sözleşme değildir. İşletmeci unvan/adres/başvuru e-postası, aktarım ve saklama takvimi kesinleşmeden genel kayıt ve ücretli hizmet açılmaz.
- `/bildirimler`: uygulama içi okunmamış mesajlar, kayıtlı arama eşleşmeleri, favori fiyat düşüşleri. SMS/e-posta/push teslim edildiği iddia edilmez.
- `/toplu-ilan`: şirket hesabı için CSV ve belirli XML şablonundan en fazla 100 satır/2 MB aktarım, önizleme, doğrulama, mükerrer retry koruması. İlanlar **duraklatılmış taslak** kaydedilir. Her ilan normal ilan düzenleme ekranında kontrol edilip fotoğraf eklenerek yayımlanır. Hesap ilan limitleri aynen geçerlidir; hatalı/limitli satırda işlem durur ve başarılı satırlar tekrar eklenmez. Evrensel üçüncü taraf XML feed dönüştürücüsü veya uzaktan fotoğraf içe aktarma değildir.
- Turnstile bileşeni ve Supabase `captchaToken` aktarımı giriş/kayıt/şifre yenilemede hazır. Site key yoksa dış script yüklenmez; CAPTCHA'nın gerçekten zorunlu olması için Supabase Dashboard'da Turnstile secret ile açılması şarttır. Kayıt ayrıca hukuk ve doğrulama uygunluğu kontrolünden geçer.
- Güvenli yapılandırılmış sunucu hata kayıtları; giriş yapmış kullanıcılar için izinli kullanım ölçümü ve istemci hata raporu. Kayıtlarda kullanıcı kimliği, e-posta, mesaj, sorgu parametresi veya ham hata metni bulunmaz. Ölçüm varsayılan kapalıdır. Dashboard/kalıcı analitik deposu yoktur; yapılandırılmış çalışma zamanı loglarıdır. İsteğe bağlı server-only SENTRY_DSN ile hata zarfı gönderen adaptör hazır, gerçek Sentry hesabıyla denenmedi. Telemetri limiti süreç başına en iyi gayret; dağıtık koruma değildir.

## Veritabanı durumu ve engellenen işlem

Canlıya uygulanan: `20261018204338_listing_search.sql` (sunucu araması, salt okuma RPC ve indeksler; mevcut RLS/yetkiler değiştirilmedi).

**Canlıya uygulanmadı:**

Önceki eş zamanlı GitHub güncellemesinden `20261018200000_rate_limits_notifications.sql` korundu ve güvenli biçimde birleştirildi: kalıcı mesaj/fiyat bildirimleri ve bildirim temizliği hazır; istek sınırları özel şemadaki sonraki migrasyonda birleştirildi. Storage metadata tablosunu doğrudan silen işlem kaldırıldı; fotoğraflar ancak Storage API ve dry-run incelemesiyle temizlenmeli. Bu migrasyon ve testi de üretimde çalıştırılmadı.

1. `20261016210353_production_moderation_and_stats.sql`: salt okunur itibar özet tablosu, security_invoker user_stats, moderasyon alanı, yönetici için app_metadata yetkisi ve RLS/trigger/grant düzenlemeleri.
2. `20261018204256_server_search_and_abuse_guards.sql`: içerik değişince yeniden inceleme, doğrudan istemci yazmalarına veritabanı sınırları, giriş yapmış izleyiciyi ilan başına günde bir sayma.

İlk üretim işlemi otomatik onay incelemesinde reddedildi: kapsamlı şema, RLS, trigger, grant ve veri güncellemesinin canlı ilan görünürlüğünü etkilemesi; bu spesifik yüksek etkili işlem için açık onay istenmesi. Başka bir araç/SQL yoluyla uygulanmadı. İkinci dosya birinciye bağlıdır ve o da uygulanmadı. `user_stats` SECURITY DEFINER ve anonim `track_view` uyarıları bu nedenle canlıda sürüyor. Mevcut rapor bunları çözülmüş saymamalıdır.

`supabase/tests/moderation_and_limits.sql` inceleme/onay sonrası yerel veya staging ortamında çalıştırılacak testtir; üretimde çalıştırılmadı. Yönetici rolü kullanıcı metadata'sından alınamaz. Admin ataması kullanıcı onayı ve sunucuda app_metadata üzerinden yapılmalıdır. Otomatik hiçbir hesaba admin yetkisi verilmedi. Yeni ilanlar bu migrasyon açıldığında moderasyon bekler; görevli moderatör olmadan yayın kuyruğu birikir. Ham public fotoğraf URL'lerinin paylaşımı ayrı depolama politikası konusudur.

## Test ve doğrulama

- Canlı veritabanında rollback ile 325 geçici ilan/profil: 300 sınırı ötesindeki ilan bulundu; şehir, kategori, fiyat, marka alias, uzaklık, literal wildcard, sıralama, 14. sayfa ve count-only kontrol edildi. Geçici veriler kalmadı.
- Uygulama test paketi, yeni CSV/draft/arama parametresi/SEO kaçış/noindex/telemetri veri azaltımı/hukuki kapı/gövde sınırı testleri.
- Next.js ve hosted Vinext typecheck/build sonuçları yayın sırasında kaydedilir. Gerçek tarayıcı/telefon ve gerçek ödeme/SMS/e-posta/CAPTCHA uçtan uca testi yapılmadı.

## Hesap/kurum bilgisi gerektiren işler

- `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_ADDRESS`, `LEGAL_CONTACT_EMAIL`: gerçek işletmeci bilgileri; nihai metinler ve saklama/aktarım planı avukatla doğrulandıktan sonra `LEGAL_TEXT_APPROVED=true`. Bu bayrak tek başına taslağı hukuken yeterli yapmaz; metinler de kesinleştirilmelidir.
- Supabase SMTP ve SMS sağlayıcısı, e-posta ve telefon otomatik onayının kapatılması; gerçek cihazla iki doğrulama testi. API mevcut sağlayıcıları kontrol eder, sahte doğrulamaya düşmez. Sızdırılmış şifre koruması Dashboard'da etkinleştirilmeli.
- Turnstile site/secret, alan adı, Supabase CAPTCHA ayarı; uygulamada `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, doğrulandıktan sonra `SUPABASE_CAPTCHA_ENABLED=true`. Secret yalnızca Supabase'de tutulur.
- Google/Apple OAuth sağlayıcı kimlikleri ve dönüş URL'leri; gerçek kullanıcı testi.
- `SENTRY_DSN` opsiyonel server-only; log saklama ve alarm alıcıları kesinleştirilmeli.
- Bildirim e-postası/SMS/push için sağlayıcı, gönderici alan adı, tercih/izin kaydı, teslim kuyruğu ve tekrar/idempotency işçisi kurulmalı. Sadece bir bildirim sayfası bunların yerine geçmez.
- iyzico sözleşmesi/anahtarları ve satıcı doğrulaması; webhook'un ulaşabileceği genel HTTPS adresi ve sağlayıcı sandbox testleri. Gerçek tahsilat kapalı kalır.
- Genel açılıştan sonra site erişimi ayrıca kullanıcı tarafından belirlenmeli; canonical alan adı doğrulanıp `PUBLIC_INDEXING_ENABLED=true` yapılmalı. Bu sürüm erişimi açmadı.

## Devam eden ürün işleri

OEM çapraz eşleştirme için doğrulanmış uyumluluk veri kaynağı; harita araması için harita sağlayıcısı; finansman/nakliye/ekspertiz için gerçek ortaklar; yerel mobil uygulama, davet programı ve ücretli mağaza paketi sonraki geliştirmelerdir. Vitrin ve parça numarası araması önceden de vardı. Fotoğraf yetimlerini güvenle silmek için Storage envanteri, DB referansları, bekleme süresi ve dry-run incelemesi gerekir; bu sürüm otomatik fotoğraf silmez.

Kaynaklar: https://supabase.com/docs/guides/database/views ; https://supabase.com/docs/guides/auth/auth-captcha ; https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/ ; https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation ; https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-

## Eş zamanlı güncelleme birleştirmesi

GitHub `94b4e8212b057a43a1777783f78e86d7dc39c7c2` incelendi. Bildirim geçmişi bileşeni, kalıcı bildirim şeması, eski hukuki adresler ve isteğe bağlı Plausible desteği korundu. Önceki kısmi arama yaklaşımı yerine bütün filtre/sıralamayı sayfalamadan önce uygulayan testli RPC kullanıldı; tek harita yerine parçalı harita seçildi. Eski hukuk metni ayrı referans dosyasında durur; aynı klasörde farklı dinamik parametre adları ve aynı sitemap URL'si çakışmaları giderildi. Plausible varsa sadece ölçüm izni sonrası yüklenir; izin geri alındığında sayfa yeniden yüklenir. Kalıcı bildirim tablosu kurulmadığında çalışan özet ekranı kalır.

Doğrulama: npm test, Next.js typecheck ve production build geçti; hosted Vinext typecheck ve production build geçti. Birleştirme sonrası aynı kontroller tekrarlanır.
