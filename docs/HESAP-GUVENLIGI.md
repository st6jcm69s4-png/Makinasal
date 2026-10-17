# Giriş ve kayıt kurulumu

Bu sürüm şifre koşullarını kayıt ve şifre yenilemede tarayıcıda ve uygulamanın sunucu uçlarında doğrular. İsim alanı profil bağlantısıdır. Google ve Apple tüm cihazlarda gösterilir; Supabase'de açık olan sağlayıcılar kullanılabilir. Gri butonlar kapalıdır.

## Yayın öncesi zorunlu Supabase ayarları

Kontrol adresi: https://supabase.com/dashboard/project/iovzgulfkahbkahcpnhb/auth/providers

- Email sağlayıcısında Confirm email açılmalı (mailer_autoconfirm=false). Özel SMTP kurulmalı ve gerçek teslim testi yapılmalı.
- Phone sağlayıcısı ve gerçek SMS hesabı açılmalı; phone_autoconfirm=false olmalı. Twilio, Vonage veya desteklenen sağlayıcı hesabının bilgileri Supabase'in kendi güvenli paneline girilmeli. Sohbete veya GitHub'a gizli anahtar koymayın.
- Authentication → Security and Protection / Password Security: minimum uzunluk 8, büyük harf + küçük harf + rakam + sembol koşulları seçilmeli. Bu ayar, doğrudan Supabase Auth API kullanıldığında da kuralı zorunlu kılar. Uygulama sunucusu aynı kuralları ayrıca kontrol eder; Auth sunucusu ayarı mevcut bağlantı araçlarıyla değiştirilemedi.
- Google Cloud OAuth web istemcisi ve Supabase Google sağlayıcısı yapılandırılmalı. Apple Developer'da web için Services ID, alan adı ve Sign in with Apple anahtarı yapılandırılmalı. Apple secret yenileme takvimi takip edilmeli.
- Her iki sağlayıcının callback adresi: https://iovzgulfkahbkahcpnhb.supabase.co/auth/v1/callback
- Site URL: https://makinasal-alperen.prettypetal16.chatgpt.site
- İzinli uygulama dönüş adresi: https://makinasal-alperen.prettypetal16.chatgpt.site/auth/callback

İnceleme sırasında email otomatik onaylı, phone/google/apple kapalıydı. İstenen zorunlu doğrulama hazır olmadan bu sürüm **yeni e-posta kaydını uygulama içinde kapalı tutar**; eski kullanıcıların şifreyle girişi sürer. Sağlayıcı ayarları tamamlandığında `/api/auth/options` bunu otomatik algılar. Üretimde gerçek SMS ve e-posta teslimi ile Apple/Google dönüşü henüz doğrulanmadı.

## Doğrulama akışı

Kayıt → e-posta bağlantısı → `/hesap-dogrula` → Auth phone-change SMS → kod doğrulama → hesap sahibi için doğrulanmış telefonun profile aktarılması. `verified_phone`, user_metadata'dan veya istemcinin gönderdiği bir bayraktan alınmaz. Yeni numara profilde doğrudan değiştirilirse doğrulama kaldırılır. Süre ve hız sınırları Supabase Auth tarafından uygulanır; arayüz yeniden gönderimde 60 saniye bekler.

Sosyal sağlayıcıdan dönüş de hesap doğrulama ekranına gider. Doğrulama tamamlanmadığında sayfa bunu açık gösterir; bu değişiklik tüm mevcut ilan/mesaj tablolarına genel bir doğrulama kilidi uygulamaz. Evrensel işlem engeli ve mobil mağaza, ödeme, moderasyon gibi diğer modüllerin tamamlanması ayrıca ele alınmalıdır.

## Testler

`npm test`: güçlü şifre, Unicode Türkçe harfler, telefon biçimleri, sağlayıcı kapalıyken kayıt hazırlık durumu.
`supabase/tests/contact_verification.sql`: gerçek Auth kaydı üzerinden bayrak senkronizasyonu, kendi hesabı kapsamı, sahte bayrak reddi, numara değişikliğinde doğrulamanın kalkması, anonim erişimin reddi. Test kayıtları transaction sonunda geri alınır.
