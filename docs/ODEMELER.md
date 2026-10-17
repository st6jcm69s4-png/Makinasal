# Ödeme entegrasyonu: hazırlanan akış ve devreye alma koşulları

## Model

Türkiye odaklı pazaryeri için iyzico Pazaryeri + Hosted Checkout Form adaptörü hazırlanmıştır. Kart bilgisi Makinasal'a gelmez. `forceThreeDS=1` ve tek çekim talep edilir. İlk kapsam: yalnızca iş sahibinin kabul ettiği ve `price_unit=toplam` olan teklifler. Saatlik/günlük birim fiyat doğrudan tahsil edilmez; önce toplam bedel üzerinde anlaşılır. İlan gezmek ödeme oluşturmaz; teklif seçmek de otomatik ödeme değildir.

`/odeme?teklif=<id>` sipariş özetini, `/odemeler` tarafların kayıtlarını gösterir. `/odeme?order=<id>` sonucu izler. Üyelik/ilan hakları ücretsiz kalır. Doğrudan makine bedeli tahsilatı, abonelik ve çoklu ürün sepeti bu kapsamda etkin değildir.

## Güvenlik

- Ödenecek tutar istemciden alınmaz. Veritabanı kabul edilmiş teklif satırını kilitleyerek tutarı kuruş cinsinden hesaplar.
- Her alıcı/istek anahtarı tek siparişe karşılık gelir. Aynı teklif için yalnızca bir aktif/ödenmiş sipariş bulunabilir. Ödeme başlatmayı yalnızca tek sunucu isteği sahiplenebilir.
- Alt üye işyeri anahtarı sadece sunucu erişimindedir. Satıcının iyzico tarafından açılıp onaylanmış ödeme hesabı yoksa tahsilat başlatılmaz.
- Browser callback veya URL'de yazan success bilgisi ödeme kanıtı sayılmaz. Sunucu kayıtlı token ile iyzico API'sinden sorgular; sipariş, kalem, fiyat, tahsilat tutarı ve para birimi eşleşmelidir.
- Webhook için X-IYZ-SIGNATURE-V3 HMAC doğrulanır; ardından sonuç yeniden sağlayıcıdan sorgulanır. Replay ve durum güncellemeleri idempotenttir. Fraud incelemesi ödeme alındı sayılmaz; ödenmiş sipariş geç gelen failure ile geri alınmaz.
- Ödeme tablolarındaki sağlayıcı alanları, ödeme kuruluşu anahtarları ve teknik olaylar istemciye açık değildir. Hosted ödeme yönlendirme URL’si yalnızca ödemeyi başlatan alıcıya döner. Kimlik/fatura bilgileri yalnızca zorunlu ödeme başlatma isteğinde sağlayıcıya iletilir; bu uygulama bunları ödeme tablolarında saklamaz veya loglamaz.
- Belirsiz ağ kesintisinde yeni tahsilat denenmez. Sipariş beklemede kalır. Kullanıcının Durumu güncelle işlemi sadece mevcut ödemeyi sorgular, yeni tahsilat başlatmaz.

## Eksik dış kurulum (gerçek tahsilat kapalı)

Mevcut ortamda yalnızca Site URL ve Supabase public değişkenleri var. Aşağıdaki hesaplar ve sunucu sırları olmadan entegrasyon çalışmaz:

- iyzico işyeri ve Pazaryeri sözleşmesi; alt üye/satıcı KYC onayı.
- IYZICO_API_KEY, IYZICO_SECRET_KEY (yalnızca sunucu sırrı), SUPABASE_SERVICE_ROLE_KEY (yalnızca sunucu sırrı).
- IYZICO_ENVIRONMENT=sandbox; testler onaylanınca live. PAYMENTS_ENABLED=true, IYZICO_MARKETPLACE_APPROVED=true gerekir. Live için ayrıca PAYMENTS_LIVE_APPROVED=true gerekir; test tamamlanmadan açılmamalıdır.
- Satıcı başına `payment_merchants` kaydı, iyzico'nun verdiği gerçek sub_merchant_key ile yalnızca yönetici/sunucu tarafından oluşturulur. Onay rozeti kullanıcı tarafından işaretlenemez.
- Public HTTPS callback: `/api/payments/callback?order=<uuid>`. Bildirim: `/api/payments/webhook`. Mevcut site yalnızca sahibine açıktır; **ödeme callback/webhook adresleri iyzico sunucularının erişebildiği bir alan adına taşınmadan canlı ödeme açılamaz**. Özel beta adresine doğrudan sağlayıcı bildirimi teslimi doğrulanmadı.
- iyzico hesabında 3DS zorunluluğu, V3 webhook imzası ve bildirimler etkinleştirilmeli. Yetkili kişinin iyzico panelinden payout onayı, iade, iptal ve itiraz süreçlerini yönetmesi gerekir. Uygulama otomatik satıcıya serbest bırakma veya iade yapmaz; emanet/teslim garantisi vaat etmez.
- İptal/iade/teslim koşulları, komisyon anlaşması, fatura ve ilgili sözleşmeler iş modeliyle tamamlanmalıdır. Bu kod tek başına ticari veya mevzuat uygunluğu onayı değildir.

## Test ve sınırlar

Birim kontrolleri: kuruş hassasiyeti, tutar doğrulaması, hosted URL allowlist, IYZWSv2, V3 webhook ve sahte bildirim reddi. SQL testleri: katılımcı erişimi, gizli alanlar, tekrar ödeme, replay, tutar değişikliği ve terminal durum güvenliği. Test kayıtları rollback ile temizlenir.

Gerçek/sandbox sağlayıcı hesabıyla uçtan uca ödeme henüz yapılmadı. Kart reddi, 3DS başarısızlığı, token süresinin dolması, webhook gecikmesi, timeout, iade ve satıcı payout testleri yapılmadan canlıya alınmamalı. Süresi dolmuş veya sağlayıcı yanıtı bilinmeyen siparişler bir yönetici tarafından sağlayıcı raporuyla uzlaştırılmalı; otomatik yeni tahsilata izin verilmez.

Resmî kaynaklar:
https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu/cf-baslatma
https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu/cf-sorgulama
https://docs.iyzico.com/en/advanced/webhook
https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
https://docs.iyzico.com/urunler/pazaryeri/pazaryeri-entegrasyonu/pazaryeri-odemesi
https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb%2Btr/main%2Bmenu/temel%2Bfaaliyetler/odeme%2Bhizmetleri/elektronik%2Bpara%2Bkuruluslari

Yeni payment_merchants ve payment_events tablolarında RLS açık, istemci yetkileri tamamen kapalıdır; bu nedenle “RLS enabled, no policy” bilgi notu beklenir. Önceden var olan user_stats görünümü ve parola sızıntı koruması uyarıları bu geliştirme kapsamında çözülmüş sayılmaz.
