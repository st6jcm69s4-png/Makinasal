# Makinasal mobil uygulaması (başlangıç sürümü)

Expo / React Native ile yazıldı. Web sitesiyle aynı Supabase veritabanını kullanır.
**Bu iskelet henüz bir cihazda veya emülatörde denenmedi.** İlk denemede hata çıkarsa ekran görüntüsünü paylaşın.

## Şu an olanlar
- İlan listesi: arama (marka, model, parça numarası), sayfalama (24'erli).
- İlan detayı: fotoğraflar, fiyat, açıklama.
- Giriş / çıkış (e-posta + şifre).
- Favoriler, mesajlaşma, teklif, satış onayı ve puanlama, bildirimler, kayıtlı aramalar, karşılaştırma.
- İlan verme ve düzenleme (kamera/galeri), ilanlarım, profil düzenleme, davet kodu, hizmet talepleri.

## Sonraki sürümler
Mesajlar, favoriler, ilan verme (kamera/galeri), bildirimler, şifre yenileme, kayıt.

## Kendi bilgisayarınızda çalıştırma (adım adım)
1. Node.js yüklü olsun (nodejs.org, LTS sürümü).
2. Terminalde: `cd mobile` ardından `npm install`.
3. `.env.example` dosyasını kopyalayıp `.env` adıyla kaydedin. `EXPO_PUBLIC_SUPABASE_ANON_KEY` satırına Supabase panelindeki **anon/publishable** anahtarı yazın. Gizli (service_role) anahtarı kesinlikle yazmayın.
4. `npx expo start` yazın. Telefonunuza "Expo Go" uygulamasını yükleyip ekrandaki QR kodu okutun.

## Mağazaya yayın için gerekenler
- Apple Developer hesabı (yıllık ücretli) ve Google Play geliştirici hesabı (tek seferlik ücret).
- `app.json` içindeki uygulama kimlikleri (`tr.com.makinasal.app`) alan adınıza göre onaylanmalı.
- EAS Build ile paket üretme, gizlilik beyanları ve mağaza incelemesi.
