# Makinasal — 18 Ekim 2026

## Bu sürüm
- Favoriler ana sayfanın son 300 ilanından bağımsız, kimlikleriyle 50’lik paketlerde yüklenir. Erişilemeyen ilan için açıklama ve kaldırma düğmesi vardır; bağlantı hatası silinmiş ilan gibi gösterilmez.
- Hesap ve misafir favorileri ayrı tutulur. Hesap değişiminde önceki kullanıcı durumu temizlenir. Favori kayıt anındaki fiyat saklanır; eşzamanlı değişiklikte yalnızca başarısız kayıt geri alınır.
- Mesajlar en yeni 50 kayıtla açılır; eski mesajlar tarih + kimlik imleciyle yüklenir. Aynı zamandaki kayıtlar atlanmaz, tekrarlı sorgular çift balon üretmez. Önceki mesajları okurken normal yenileme aşağı kaydırmaz.
- Konuşma önizlemeleri `latest_thread_messages` ile konuşma başına alınır; bir konuşmanın 300’den fazla mesajı diğerlerinin önizlemesini yok etmez. Fonksiyon SECURITY INVOKER; katılımcı RLS kuralları korunur.
- Gönderim hatasında taslak korunur. Yanıtı kaybolan aynı mesaj tekrar gönderilirse aynı UUID kullanılır; ikinci bir kayıt oluşturmaz.
- Giriş ve ödeme API yanıtları nesne/tür doğrulamasından geçer. Barındırma ortamının katı TypeScript denetimindeki eski JSON tür hataları giderildi.

## Önceki sürüm korunur
Bordo menü, profil bağlantıları, kiralık makine/personel merkezi, makineye göre yedek parça filtreleme, şirket envanteri, İş ve hizmetler merkezi, il/ilçe ve profil açıklamaları, şifre koşulları ve kapalı ödeme hazırlığı korunur.

## Dış kurulum bekleyenler
`HESAP-GUVENLIGI.md` ve `ODEMELER.md` geçerlidir. SMS, gerçek e-posta onayı, Google/Apple hesapları ve iyzico onayı/sırları henüz bağlı değildir. Yeni kayıt doğrulama sağlanana kadar kapalıdır; gerçek tahsilat kapalıdır. Ödeme bildirimleri için sağlayıcının erişebildiği HTTPS adresi gerekir.

## Bilinen sınırlar
- Genel ilan araması hâlâ son 300 aktif ilanın yerel havuzunu kullanır. Favoriler ve özel yedek parça araması bu sınıra bağlı değildir; tam katalog için sunucuda filtreleme/sayfalama ayrı iştir.
- Kayıtlı arama yeni ilan sayıları mevcut ilan havuzuna dayanır; SMS/e-posta bildirimi gönderilmez.
- Gerçek cihaz/tarayıcı testi ve gerçek sağlayıcı hesabıyla uçtan uca giriş/ödeme testi yapılmadı.
- Önceden var olan user_stats SECURITY DEFINER görünümü, kasıtlı yetkili yardımcı fonksiyonlar ve sızmış şifre koruması ayarı için Supabase danışman uyarıları sürer. Bu sürüm bunları giderilmiş saymaz.

## Doğrulama
`npm test`, `npm run typecheck`, Next üretim derlemesi, Vinext tür kontrolü/üretim derlemesi ve `supabase/tests/message_history.sql` kullanılır. Veritabanı testleri geçici kayıtları transaction sonunda geri alır. Kapsam: 300 üzeri önizleme, katılımcı dışı erişim reddi, 50 mesajlık sayfalar, aynı timestamp imleci; birim testleri: 150 kayıt birleştirme, yinelenen mesaj, eski favori, ağ hatası ve bozuk API yanıtı.

## 18 Ekim 2026 — son birleştirilmiş durum

Sunucu taraflı arama, tüm filtre/sıralama/count ve 24 sonuçluk sayfalama; 325 ilanla rollback testi geçti. SEO özel-beta noindex kapısı ve parçalı haritalarla tamamlandı. Hukuki taslaklar, çerez tercihi, bildirim özetleri, CSV/XML taslak aktarımı, CAPTCHA ve gözlemlenebilirlik bağlantıları eklendi. Önceki hukuki URL'ler yönlendirilir; bildirim geçmişi ve Plausible hazırlığı korunur.

**Veritabanında yalnızca arama migrasyonu uygulandı. Moderasyon/RLS ve kalıcı bildirim/rate-limit migrasyonları uygulanmadı.** Canlı moderasyon işlemi otomatik onay incelemesinde reddedildi. Sızdırılmış şifre koruması, gerçek sağlayıcılar ve hukuk onayı bekliyor. SMS/e-posta/push gönderimi, tahsilat, mobil uygulama, ortaklıklar ve otomatik fotoğraf silme etkin değildir.

Ayrıntılar ve kurulum: `docs/CANLIYA-HAZIRLIK-2026-10-18.md`. `app/sitemap.ts` tek-parça alternatifi yerine `app/sitemap.xml/route.ts` kullanılır. `lib/legalDraftReference.ts` önceki taslağın arşividir; güncel kullanıcı sayfaları `app/hukuki/[slug]/page.tsx` içindedir.
