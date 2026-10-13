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
