# Makinasal — 18 Ekim 2026 son durum

## Bu turda tamamlanan ve canlıya uygulanan

Kullanıcının “hepsini hallet” onayı üzerine aşağıdaki migrasyonlar üretim Supabase projesine uygulandı:

- `production_moderation_and_stats`: salt okunur itibar özet tablosu, `security_invoker=true` user_stats, app_metadata tabanlı moderatör yetkisi, ilan/fotoğraf/şikayet RLS ve moderasyon kuyruğu.
- `server_search_and_abuse_guards`: doğrudan veritabanı istemcilerinde mesaj 30/dk, teklif mesajı 30/dk, şikayet 5/dk, ilan/iş kaydı 10/dk, teklif 15/dk sınırı. Oturum açan izleyicinin ilan başına görüntülenmesi günde bir sayılır; toplam 120/dk sınırı. Anonim görüntülenme RPC erişimi kaldırıldı.
- `rate_limits_notifications`: kalıcı yeni mesaj ve favori fiyat düşüşü bildirimleri, yalnızca ilgili kullanıcıya okuma ve read_at güncelleme yetkisi. Bakım fonksiyonu istemcilere kapalıdır; bu turda çalıştırılmadı/zamanlanmadı.
- `respect_moderation_in_contact_and_notifications`: onaysız ilan için telefon açıklanmaz ve fiyat bildirimi gönderilmez; mevcut tablolar/tetikleyiciler/izinler korunur.
- `public_search_approved_only`: arama sahibinin kendi onaysız taslaklarını da genel sonuçlardan çıkarır; sahibi taslağı profilinden görebilir.

Mevcut genel arama RPC'si de canlıdadır: tüm aktif/onaylı ilanlarda filtre, count ve sıralama, ardından 24 kayıtlık sayfalama. Son 300 ilan yalnızca kısa ana sayfa keşif havuzudur. Kayıtlı arama sayıları ve karşılaştırma bu havuzdan bağımsızdır.

## Uygulama davranışı

- Yeni ilanlar ve içerik/fiyat değişiklikleri moderasyon bekler. İlanın kendi sahibi ve moderatör taslağı görebilir; başkaları göremez. İlan sahibi kendi ilanını onaylayamaz. Durum/son doğrulama gibi zararsız güncellemeler tekrar moderasyona göndermez.
- İlan detayı sunucuda istek oturumunu kullanır; RLS korunur. Böylece sahibi kendi bekleyen ilanında 404 almaz. Taslakta Product/Offer verisi ve indekslenme yayımlanmaz. Arama/ana sayfa/mağaza listeleri sadece onaylı ilanları gösterir.
- Profil ve ilan formunda “yayınlandı” yerine gerçek inceleme durumu gösterilir. İçerik/fiyat düzenleyen kullanıcı onay beklediğini görür.
- `/bildirimler`: okunmamış mesaj, kayıtlı arama ve favori fiyat özeti; kalıcı geçmiş 50'lik imleçli sayfalarla yüklenir. UUID/tarih doğrulaması, güvenli hedef bağlantıları, okundu işaretleme ve hesap değişiminde bileşen sıfırlama vardır. Uygulama dışı e-posta/SMS/push gönderilmez.
- Moderasyon sırasında yapılan fiyat değişikliği erken kalıcı bildirim üretmez. Onay sonrası favori fiyat özeti güncel fiyatı gösterir. Bekleyen fiyat olayını saklayıp onay anında tarihçeye aktarmak ayrıca uygulanmış bir özellik değildir.
- SEO: özel beta noindex; parçalı sitemap ve robots; açıklama/canonical/OG; onaylı aktif ilanlarda güvenli JSON-LD. Paylaşım erişimi değiştirilmedi. Genel açılışta gerçek canonical adresle yeniden derlenip `PUBLIC_INDEXING_ENABLED=true` yapılmalıdır.
- Hukuki taslaklar, çerez tercihleri, şirketler için CSV/XML'den en fazla 100 satır/2 MB taslak aktarımı, Turnstile bileşeni ve gizli veri içermeyen hata/kullanım logları hazırdır. Aktarılan ilanlar taslaktır, mevcut hesap limitlerine tabidir. Fotoğraflar uzaktan otomatik alınmaz.
- Ölçüm varsayılan kapalıdır. İsteğe bağlı Plausible yalnızca ölçüm izninden sonra yüklenir; izin geri alındığında sayfa yeniden yüklenir. Sentry adaptörü server-only DSN gerektirir; gerçek hesapla denenmedi.

## Doğrulanan testler

Rollback ile üretimde çalıştırılan, sonunda sıfır test kullanıcısı/ilanı bırakan testler:

1. `moderation_and_limits.sql`: sahip kendi ilanını onaylayamaz; user_metadata ile admin olunamaz; moderatör onayı çalışır; üçüncü kişi bekleyeni göremez; sahibi de genel aramada taslağını bulamaz; anonim itibar özeti çalışır; sayaç sınırı zorunludur.
2. `rate_limits_notifications.sql`: 31. mesaj engellenir, ilk 30 mesaj 30 bildirim üretir, izleme günde bire iner, onaylı fiyat düşüşü bildirimi oluşur, bildirimler kullanıcılara ayrılır. Bakımın çağrılamadığı EXECUTE ayrıcalığıyla doğrulanır; bakım çalıştırılmaz.
3. `moderation_visibility.sql`: bekleyen ilan telefonu açıklanmaz/sayılmaz; bekleyen fiyat değişikliğinden bildirim üretilmez; onaylı fiyat düşüşü çalışır.
4. `listing_search.sql`: 325 geçici ilan; 300 sınırı ötesindeki sonuç, kategori/şehir/fiyat/marka alias/uzaklık, literal wildcard, toplam, sıralama ve son sayfa.
5. `message_history.sql` ve `message_profanity.sql`: mesaj geçmişi, katılımcı RLS, yetkisiz erişim, TR/EN küfür ve güvenli normal mesajlar.

Uygulama kontrolleri: npm test, Next typecheck/production build ve hosted Vinext typecheck/build. Tarayıcı kontrol aracı bulunmadığı için gerçek tarayıcı/telefon etkileşim testi yapılmadı. Gerçek SMS/e-posta/CAPTCHA/ödeme sağlayıcısıyla uçtan uca test yapılmadı.

## Yönetici ve sağlayıcı hazırlığı — açık kalan gerçek bağımlılıklar

Canlıda 2 hesap ve **0 atanmış yönetici** var. Yanlış kişiye yetki vermemek için yönetici yapılacak **mevcut Makinasal hesabının kayıtlı e-posta adresi** kullanıcıdan alınmalıdır. Hiçbir hesabın adına bakılarak admin verilmedi. `/yonetim` rolü yalnızca sunucudan app_metadata ile atanır; rol atandıktan sonra yeni oturum gerekir.

Auth servisinden bu turda okunan durum: Google kapalı, Apple kapalı, telefon sağlayıcısı kapalı, e-posta etkin ancak otomatik onay açık. Bu nedenle istenen e-posta+SMS doğrulaması sağlanmıyor. Sites ortamında yalnızca Supabase URL/public key ve Site URL mevcut; ödeme, CAPTCHA, yasal kimlik ve Sentry ayarları yok.

| Gereken | Tamamlama yolu |
|---|---|
| SMTP ve SMS | Supabase Auth'ta gerçek sağlayıcı hesapları, gönderici doğrulaması; e-posta/telefon otomatik onayı kapalı; gerçek teslim testi |
| Turnstile | Cloudflare site/secret ve alan adı; secret Supabase CAPTCHA ayarına, site key `NEXT_PUBLIC_TURNSTILE_SITE_KEY` alanına; doğrulandıktan sonra `SUPABASE_CAPTCHA_ENABLED=true` |
| Google / Apple | İlgili geliştirici hesapları, OAuth kimlikleri ve dönüş adresleri; gerçek giriş testi |
| Hukuki kimlik | Gerçek işletmeci unvan/adres/başvuru e-postası, saklama/aktarım takvimi ve hukuk onaylı nihai metinler; sonra `LEGAL_TEXT_APPROVED=true` |
| iyzico | Pazaryeri sözleşmesi, gerçek anahtarlar ve satıcı onayı, genel webhook adresi; önce sandbox E2E; tahsilat şu an kapalı |
| Sızdırılmış şifre koruması | Supabase Auth Dashboard'da etkinleştirilmeli; mevcut MCP bu ayarı değiştirmiyor |
| E-posta/SMS/push bildirimleri | Gönderici/izin ve sağlayıcı kurulumu, kuyruk/tekrar/idempotency işçisi; şu an yalnızca uygulama içi |
| Sentry/analitik | Hesap/DSN, saklama ve alarm alıcıları; şu an yapılandırılmış loglar ve izinli ölçüm altyapısı |

Anahtarları sohbete veya depoya koymak yerine ilgili sağlayıcı ve Sites gizli ortam ayarlarında tutun. Bunlar olmadan kayıt ve tahsilat açıkmış gibi gösterilmez.

## Güvenlik ve operasyon sınırları

`user_stats` SECURITY DEFINER ve anonim track_view uyarıları giderildi. Yetkili çağrılan dört SECURITY DEFINER RPC (`listing_phone`, `my_phone`, `mark_thread_read`, `track_view`) kaldı; erişim/katılımcı kontrolleri gerekir ve uyarılar çözülmüş sayılmaz. Ödeme özel tablolarının ve özel sayaç tablosunun RLS politikası olmaması deny-all tasarımının parçasıdır. Sızdırılmış şifre koruması hâlâ kapalıdır.

Sayaçların otomatik süreli fiziksel temizliği, mesaj/fotoğraf silme ve bildirim saklama planı bu turda zamanlanmadı. Fotoğrafları storage metadata tablosundan SQL ile silen işlem kullanılmaz; Storage API ve önce dry-run incelemesi gerekir. Kapalı beta erişimi korundu. Harita, OEM uyumluluk verisi, finansman/nakliye/ekspertiz ortaklıkları, davet sistemi ve yerel mobil uygulama sonraki ürün işleridir.

## Otomatik inceleme ve güvenli alternatifler

Kullanıcının açık onayı sonrasında üç bekleyen migrasyon uygulandı. Ek geniş bildirim refaktörü (fonksiyon/trigger değiştirme, bekleyen fiyat olayı ve otomatik sayaç temizliği) otomatik incelemede reddedildi ve uygulanmadı; bu öneri mevcut migrasyon zincirine konmadı. Bunun yerine tablo/trigger/izinleri koruyan iki fonksiyonluk dar görünürlük kontrolü düşük riskli alternatif olarak onaylanıp test edildi. Bakımı çalıştıran test de reddedildi; bakım çağrısı çıkarılıp yetki salt okuma kontrolüyle doğrulandı. Hiçbir reddedilen işlem başka araçla uygulanmadı.
