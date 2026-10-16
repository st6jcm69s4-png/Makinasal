# Geliştirme durumu — 16 Ekim 2026

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
5. İlan oluşturma + fotoğraf yüklemeyi taslak/yayın işlemiyle güvenilir yap; kısmi yükleme ve tekrar deneme, silme sırasında depolama hatalarını ele al.
6. Admin moderasyonu, rapor inceleme, spam sınırları ve gerçek kullanıcı senaryoları için entegrasyon testlerini tamamla.
7. Premium ödeme, SMS/kimlik doğrulaması ve native mobil uygulama henüz uygulanmadı. Sağlayıcı seçimi, hesapları ve yayın ayarları gerekir.

## Veritabanı sürümleme
`supabase/schema.sql` ve 002–005 dosyaları eski başlangıç kurulumudur. Yeni `migrations/` dosyası bunların yerine bir tam kurulum değildir; var olan şema üzerinde uygulanır. Canlıya aynı değişikliği tekrar basmadan önce uzak migration geçmişini kontrol et.

## Kapsam
Bu kayıt ilk sağlamlaştırma paketidir. Tüm özelliklerin tamamlandığı veya sitenin yeni sürümünün yayınlandığı anlamına gelmez.
