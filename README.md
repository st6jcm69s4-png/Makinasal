# Makinasal — Next.js başlangıç projesi

## Çalıştırma
1. Node.js LTS yükle.
2. Bu klasörü VS Code ile aç.
3. Terminal: `npm install`
4. Terminal: `npm run dev`
5. Tarayıcı: http://localhost:3000

## Şu anki durum
- Makinasal V6 prototipi `public/prototip.html` içinde korunuyor.
- Next.js ana sayfası prototipi iframe içinde gösteriyor. **Bu, gerçek React bileşenlerine dönüşüm değildir.**
- Demo ilanlar, mesajlar ve diğer etkileşimler gerçek bir sunucuya bağlı değildir.
- Apple/Google/SMS girişi, veritabanı ve ödeme sistemi henüz yoktur.

## Birlikte geliştirme sırası
1. HTML içindeki veri modellerini ve kategori yapılarını TypeScript dosyalarına ayır.
2. Üst menü, sol menü, ilan kartı ve filtreleri React bileşenlerine dönüştür.
3. Sayfaları `/ilanlar`, `/gunluk-isler`, `/talepler`, `/profil` rotalarına taşı.
4. Supabase projesi kur, Auth ve PostgreSQL tablolarını ekle.
5. Yetkilendirme (RLS), fotoğraf depolama, mesajlaşma ve moderasyon kur.
6. Gerçek testler, erişilebilirlik ve mobil deneyim.
7. Web sürümünü yayınla; ardından Expo/React Native ile uygulamayı geliştir.

## İlk ders
`app/page.tsx` ana sayfadır. `app/layout.tsx` genel HTML iskeletidir. `public/` statik dosyaları tutar.

## Güvenlik
Gerçek kimlik belgelerini prototipte saklama. Sunucu tarafı doğrulama ve RLS olmadan canlı kullanıcı verisi toplama.

## Kod yapısı (1. adım tamamlandı)
- `lib/data/` — prototipten aktarılan kategoriler, şehirler, satıcılar ve demo ilanlar (TypeScript).
- `lib/trust.ts` — güven seviyesi kuralı (Riskli / Yeni üye / Orta güven / Güvenilir / Çok güvenilir).
- `lib/pricing.ts` — kategori medyanı ve fiyat uyarısı (parça/lastikte hesaplanmaz).
- `lib/messageFilter.ts` — mesajda IBAN/link engeli, kapora uyarısı.
- `lib/geo.ts`, `lib/format.ts` — mesafe ve TL/sayı biçimleri.
- Kural testi (npm gerekmez, Node 22+): `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/check-logic.mjs`

## Sayfalar (2. adım)
- `/ilanlar` — filtreli ilan listesi (arama, kategori, şehir, fiyat, sıralama)
- `/ilanlar/[id]` — ilan detayı: özellikler, fiyat uyarısı, satıcı güven seviyesi
- `/prototip.html` — eski HTML prototip (karşılaştırma için duruyor)
Henüz yok: giriş, ilan verme, mesajlaşma, puanlama, veritabanı bağlantısı.

## Giriş sistemi (3. adım)
- `/giris` — e-posta + şifre ile kayıt ve giriş (Supabase Auth). Üst menüde kullanıcı adı ve Çıkış düğmesi.
- Kurulum: `.env.local.example` dosyasını `.env.local` olarak kopyalayıp Supabase URL ve anon anahtarını yaz. `npm install` (yeni paketler var) ve `npm run dev`.
- Geliştirme sırasında Supabase → Authentication → Sign In / Providers → Email bölümünde "Confirm email" seçeneğini kapatırsan kayıt sonrası onay e-postası beklemezsin. Canlıya çıkmadan önce tekrar aç.

## İlan verme (4. adım)
- `supabase/002-ilan-foto.sql` — **bir kez** SQL Editor'de çalıştırılır (schema.sql'den sonra): ilan doğrulamaları, ücretsiz üyelik limitleri (3 ilan, 8 fotoğraf; premium 30/20), `listing-photos` fotoğraf deposu ve güvenlik iyileştirmeleri.
- `/ilan-ver` — form + fotoğraf yükleme (telefon fotoğrafları yüklemeden önce 1600px'e küçültülür).
- `/ilanlarim` — ilanları duraklat / satıldı / sil.
- `/ilanlar` ve `/ilanlar/[id]` artık gerçek ilanları veritabanından okur (demo ilanlar "Demo" etiketiyle altında kalır).

## Mesajlaşma (5. adım)
- `supabase/003-mesaj.sql` — mesaj uzunluğu sınırı; SQL Editor'de bir kez çalıştırılır.
- İlan detayında **Satıcıya yaz** → `/mesajlar/[id]` konuşma sayfası; `/mesajlar` gelen kutusu.
- Mesajlarda IBAN ve link engellenir, "kapora / ön ödeme / havale / EFT" için uyarı çıkar (istemcide ve veritabanında).
- Yeni mesajlar sekme açıkken 4 saniyede bir kontrol edilir.
- Sıradaki: iki taraflı satış onayı ve puanlama.
