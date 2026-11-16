# Makinasal · Mağaza görünürlüğü (ASO) planı

Kaynak: "App Store'da kimse seni bulamıyor" videosundaki 20 madde (16 Kasım 2026).
Metinler `mobile/store.config.json` (App Store) ve `mobile/store/google-play.json` (Google Play) içinde.
Her değişiklikten sonra denetim: `node store/kontrol.mjs` (mobile klasöründe).

## Hazır olanlar

| # | Madde | Durum |
|---|---|---|
| 1 | Anahtar kelime alanı 100 karakter | TR 97, EN 98, DE 100 karakter dolu |
| 2 | Virgülden sonra boşluk yok | Denetim betiği kontrol ediyor |
| 3 | Aynı kelime başlık, alt başlık ve anahtar kelimede tekrar etmiyor | Denetim betiği kontrol ediyor |
| 4 | Başlıkta marka + anahtar kelime | "Makinasal: İş Makinesi İlanı", "Makinasal: Heavy Equipment", "Makinasal: Baumaschinen-Markt" |
| 5 | 30 karakterlik alt başlık kullanılıyor | 3 dilde dolu |
| 6 | Tekil/çoğul ikisi birden yok | Yalnızca tekil yazıldı |
| 7 | Kategori adı ("iş", "alışveriş", "business") anahtar kelimede yok | Kategori: İş + Alışveriş |
| 8 | Rakip markası yok (sahibinden, letgo, arabam vb.) | Betik engelliyor. Makine markaları (CAT, JCB, Hidromek…) da yazılmadı: başkasının markası, ret riski |
| 9 | Birden çok dil | Türkçe, İngilizce, Almanca (her biri ayrı 100 karakter) |
| 10 | Anahtar kelimeler çevrilmedi, her dil için ayrı seçildi | Örn. Almanca "radlader, kipper, walze" |
| 15 | Açıklamanın ilk 2 satırı fayda anlatıyor | "…alıp satmanın en kolay yolu. Satıcıyla doğrudan konuş, komisyon ödeme." |
| 16 | Uygulama içinden puan isteme | Eklendi (`lib/review.ts`): ilan satıldı, ilan yayına gönderildi, 5. favori. En az 3 farklı gün kullanım, 120 günde bir |

Not: "iş makinası" diye yanlış yazımla arayan çok olduğu için Türkçe anahtar kelimeye "makinası" eklendi.

## Mağazaya göndermeden önce yapılacaklar

### 11 · İkon
Ana ekran boyutunda (60 px) tek bakışta "iş makinesi" okunmalı. Şu anki ikonu 60 px'e küçültüp kontrol et; ince çizgi ve yazı varsa kalın tek bir şekle indir. Yazı (marka adı) ikona konmaz.

### 12–13 · İlk 3 ekran görüntüsü + üstünde tek cümle fayda
Kararı ilk 3 görsel verir. Sıra ve başlıklar:
1. Ana sayfa / kategori ızgarası: **"Sadece iş makinesi ve ağır vasıta"**
2. Arama sonucu (filtreli): **"İl, marka, yıl ve saate göre bul"**
3. İlan sayfası (karne + nakliye görünür): **"Bakım karnesi ve nakliye tahmini"**
4. Açık artırma: **"Makineni açık artırmaya çıkar"**
5. İş Ağı: **"Operatör, eleman ve çekici bul"**
6. İlan ver: **"Dakikalar içinde ücretsiz ilan ver"**

Ekran görüntülerinde gerçek görünümlü örnek ilanlar olmalı; başka bir uygulamanın ya da markanın logosu görünmemeli. İngilizce ve Almanca sayfalar için başlıklar çevrilir.

### 14 · Önizleme videosu (15–30 sn, dikey)
Ana sayfa → kategoriye dokun → filtrele → ilanı aç → karneyi kaydır → "Mesaj gönder". Ses gerekmez, üstte kısa yazılar olsun. Video sayfada kalma süresini artırır.

### 17 · Yorumlara cevap
App Store Connect → Puanlar ve Yorumlar bölümünden her yoruma (özellikle kötü yorumlara) 2–3 gün içinde cevap yaz. Örnek:
- Hata bildirimi: "Bildirdiğin için teşekkürler. Sorunu 1.x sürümünde düzelttik; güncelleyip tekrar dener misin? Devam ederse destek@… adresine yazabilirsin."
- Öneri: "Güzel fikir, yol haritamıza ekledik. Teşekkürler!"
Cevap verilen kullanıcılar yorumlarını sık sık günceller, bu da puanı yükseltir.

### 18 · Özel ürün sayfaları (Custom Product Pages)
App Store'da 70 farklı sayfa açma hakkı var. Başlangıç için 3 tane:
- **Alıcı**: ekskavatör ve kamyon ilanları ön planda (Google/Instagram reklamları için)
- **İş arayan / operatör**: İş Ağı ekranları ön planda
- **Firma / bayi**: mağaza, toplu ilan, Firma Pro ön planda
Her sayfanın kendi bağlantısı olur; reklamda ve web sitesinde ilgili bağlantı kullanılır.

### 19 · Düzenli güncelleme
Uzun süre güncellenmeyen uygulama "ölü" sayılır. Hedef: en az ayda bir sürüm, her sürümde `releaseNotes` güncellenir. Anahtar kelimeler 4–6 haftada bir veriye göre yenilenir.

### 20 · Hangi kelimeden indirme geliyor?
App Store Connect → Analiz (App Analytics) → Kaynaklar → "App Store Arama" ve Apple Search Ads ücretsiz anahtar kelime önerileri. Google Play Console → Mağaza performansı → Arama terimleri. Ayda bir bak; indirme getirmeyen kelimeyi değiştir.

## Gönderim sırasında dikkat
- Gizlilik ve destek bağlantıları `makinasal.com` alan adını kullanıyor. Alan adı bağlanmadan ve hukuki metinler onaylanmadan mağazaya gönderilmez.
- App Store inceleme ekibi için deneme hesabı bilgileri bu dosyaya yazılmaz; doğrudan App Store Connect'e girilir.
- Metinler App Store Connect'e `eas metadata:push` ile gönderilir (ilk sürüm `eas submit` ile yüklendikten sonra).
