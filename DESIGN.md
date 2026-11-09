# Makinasal: tasarım dili

Kaynak dosya: `mobile/lib/theme.ts` (mobil), `app/globals.css` (web). Renk ve ölçü buradan alınır; ekranlara elle renk kodu yazılmaz.

## Fikir
"Ruhsat ve iş emri": bilgi, etiketli alanlarda ve net sayılarla durur. Süs yok; sıcak, tozlu bir saha zemini üzerinde koyu mürekkep ve tek vurgu rengi.

## Renk
- **Petrol yeşili teması (varsayılan):** zemin kum `#EDE5D6`, kart `#F7F1E6`, üst alan `#E5D7BC`, mürekkep `#1E211C`, vurgu `#0D7468`. Koyu: zemin `#151412`, kart `#201E1A`, vurgu `#117A70`, vurgulu yazı `#5FD3C4`.
- **Bordo teması:** grafit üst alan `#25272D`, sıcak beyaz zemin, vurgu `#800020`.
- Tek vurgu rengi. Aynı ekranda ikinci bir canlı renk yok. Mavi ve turuncu yasak.
- Durum renkleri yalnızca anlam taşır: iyi (yeşil), uyarı (hardal), kötü (kiremit).
- Marka (logo): kömür zemin + açık yeşil `#3FC2AE`; temadan bağımsız.

## Yazı
- Şu an Inter (400/500/600/700). Başlık 18-28 kalın, gövde 15-16, yardımcı 12.5-13.5.
- Sayılar (fiyat, saat, ton) kalın ve çevresindeki metinden büyük.
- Tümü büyük harf yalnızca çok kısa etiketlerde; cümleler normal yazılır.
- **Bilinen zayıflık:** Inter, yapay zekâ ile yapılmış uygulamaların en yaygın yazı tipidir. Karakterli bir başlık yazı tipi (ör. bir grotesk ya da dar sanayi tipi) ayırt ediciliği en çok artıracak tek değişikliktir; paket kurulumu gerektirir.

## Biçim
- Köşe yarıçapı 12 (kartlar 16). Hap biçimi yalnızca etiket ve sekmede.
- Gölge tek tip ve hafif (`shadow`). Hiyerarşi gölgeyle değil boşluk, çizgi ve yazı ağırlığıyla kurulur.
- İnce ayırıcı çizgi `line`. Kart içinde satırlar çizgiyle ayrılır.
- Simge: Feather çizgi simgeler, 15-22 pt; yalnızca anlam taşıdığında.

## Bileşen kuralları
- Birincil düğme: dolu vurgu rengi, beyaz yazı. İkincil: çerçeveli. Yıkıcı işlem: kiremit ve her zaman onay sorusu.
- Seçim: eşit genişlikte parçalı düğme (Ayarlar'daki gibi) ya da hap biçimli çipler.
- İlan kartı: fotoğraf önce, fiyat en belirgin, altında yıl · saat · il.
- Boş durum: bir cümle + tek eylem. Çizim ya da maskot yok.
- Hata metni ne olduğunu ve ne yapılacağını söyler ("... yüklenemedi. Lütfen sayfayı yenileyin.").

## Hareket
- Kısa ve işlevsel (150-300 ms). "Hareketi azalt" ayarına uyulur.
- Açılış: logo parçalarının birleşmesi (yaklaşık 1,7 sn).

## Kaçınılacaklar (yapay zekâ görünümü)
Mor/mavi geçişli zeminler, her bölümde aynı üçlü kart ızgarası, anlamsız simgeli "özellik" kutuları, aşırı yuvarlak her şey, cam efekti, emoji başlıklar, ortalanmış uzun metinler, her yerde aynı gölge. Ayrıntılı liste: `.claude/skills/expo-design-system/references/native-slop.md`.
