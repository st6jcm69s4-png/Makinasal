# Makinasal: web ve mobil yayın planı

## Şu an hazırlanan
Web uygulaması Supabase'e bağlıdır. Demo ilanlar varsayılan olarak kapalıdır. `/uygulama` sayfası ana ekrana ekleme adımlarını gösterir. Web manifesti, 192/512 simgeler ve service worker bulunur. Service worker yalnızca genel çevrimdışı ekranını ve simgeleri saklar; hesaplar, mesajlar ve API yanıtları önbelleğe alınmaz.

Bu sürüm bir APK/IPA değildir. İnternet olmadan ilan ve mesaj okunmaz. App Store/Google Play yayını yapılmadı.

## Native uygulama
Önerilen yol Expo / React Native ile ayrı `mobile/` istemcisidir. Next.js web sayfalarının HTML bileşenleri (`div`, `input`, `img`) native ekranda doğrudan çalışmaz. UI React Native bileşenleriyle hazırlanır; veri modeli, mesaj/fiyat/güven kuralları ve Supabase arka ucu paylaşılır.

1. Expo istemcisi, güvenli cihaz oturum saklama ve deep link ile hesap kurtarma.
2. İlan listesi/detayı, filtreler, favoriler, profil.
3. Kamera/galeri ile fotoğraf yükleme, mesajlaşma ve cihaz bildirimleri.
4. Fiziksel Android/iPhone testleri ve EAS dağıtım paketleri.
5. Kullanıcının Apple/Google geliştirici hesaplarından mağaza başvurusu, gizlilik beyanları ve uygulama incelemesi.

Mağaza hesabı, uygulama kimliği, imzalama ve gerçek cihaz testleri olmadan mağaza yayını tamamlanmış sayılmaz. Web sitesini sadece uzak URL açan WebView kabuğuna koymak native uygulama testlerinin ve mağaza incelemesinin yerine geçmez.

Kaynaklar:
- https://docs.expo.dev/guides/using-nextjs/
- https://docs.expo.dev/workflow/web/

## Yayından önce kalan bağımlılıklar
- Supabase Auth URL izin listesine yayın adresinin `/auth/callback` yolunu eklemek; gerçek test hesabıyla onay ve şifre yenileme teslimini kontrol etmek.
- Moderasyon/veri güvenliği migration'ı otomatik onay denetiminde reddedildi; uygulanmadı. Dosya: `supabase/migrations/20261016210353_production_moderation_and_stats.sql`.
- Yönetici rolü yalnızca sunucudan yönetilen `app_metadata.role = admin` ile verilmeli; kullanıcı düzenleyebildiği `user_metadata` asla yetki kaynağı değildir.
- Ödeme ve SMS sağlayıcı hesapları bağlı değil. Sistem kart bilgisi veya emanet para kabul etmiyor. Kimlik doğrulama için sağlayıcı ve veri saklama süreci henüz seçilmedi.
- İşletme/iletişim bilgileri ve gerekli hukuki metinler, işletme bilgileri doğrulandıktan sonra hazırlanmalı. Test yayını bunların tamamlandığı anlamına gelmez.
