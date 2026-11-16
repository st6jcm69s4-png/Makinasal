# Makinasal mobil — tasarım dili: "ruhsat alanları"

Renkler web ile aynıdır ve değişmez: lacivert #25272D, bordo #800020, kâğıt #F6F5F3, çizgi #DDD9DC, soluk #66616A.

- **Yazı tipi:** Barlow (metin, başlık), Barlow Condensed (alan etiketleri). Yüklenemezse sistem yazı tipi.
- **Alan etiketi:** küçük, sıkı, büyük harf; değer altında büyük. `caps()` ile Türkçe büyük harf (i→İ).
- **Çizgi:** 1px ortak hücre çizgisi; kartlar 4px köşe, gölge yok. Bölüm başlığı üstte 2px lacivert çizgi (`Band`).
- **Simgeler:** Feather (emoji yok). Aktif sekme: üstte 3px bordo çubuk.
- **Bileşenler:** `Label`, `Field`, `Select`, `Btn`, `Chip`, `Band`, `FieldCell/FieldGrid` (components/ui.tsx), `ListingCard` (yıl / il şeridi).
- **Kural:** yeni ekranlar `lib/theme.ts` renklerini ve `radius=4` değerini kullanır; sabit hex yazılmaz.

## Eklemeler
- Geri düğmesi çerçevesiz ok; alt sekmeye basınca liste başa kayar (`lib/scrollTop.ts`).
- Bölüm anahtarı (İş Ağı, Mesajlar): üstte 3px bordo çizgi, seçili hücre lacivert.
- Fotoğraflı bloklar: gerçek ilan fotoğrafı + altında lacivert plaka şeridi (kategori kutuları, öne çıkan ilan). Gradyan ve gölge yok.
- Hukuki: `app/hukuki`, `app/haklarim` (KVKK md. 11 başvuruları, `data_requests` tablosu, Yönetim'de 30 gün sayacıyla).

## Arayüz kiti (components/kit.tsx)
shadcn/ui kalıplarının React Native uyarlaması: Badge, StatusBadge, AlertBox, Skeleton (CardSkeleton/RowSkeleton), Tabs (filled/line), Avatar, Progress, Separator. Renkler ve 4px köşe Makinasal'a aittir; yüklenme için dönen çember yerine iskelet, hata/uyarı için AlertBox, durum için StatusBadge kullanılır.

## Apple yönergeleri (16 Kasım 2026)
Kaynak: Apple İnsan Arayüzü Yönergeleri ("Apple Look", github.com/dickwu/apple-design-skill) ve Emil Kowalski'nin hareket kuralları ("Apple Motion", `.claude/skills/apple-design`, `animate-expo`, `gestures`). Yeni ekran ve bileşenler bu listeye uyar:

- **Dokunma alanı:** en az 44×44 pt (Android 48 dp). Görsel küçükse `hitSlop` eklenir, görsel büyütülmez.
- **Ekran okuyucu:** yalnızca simgeden oluşan her düğmede `accessibilityLabel` olur.
- **Yazı:** en küçük 11 pt (LText büyütmesinden önce). Telefonun yazı boyutu ayarı kapatılmaz (`allowFontScaling` açık).
- **Harf aralığı:** boyuta göre otomatik (LText, Inter formülü): büyük yazıda sıkı, küçük yazıda biraz açık. Büyük harfli etiketler kendi aralığını belirler.
- **Kontrast:** metin en az 4.5:1 (tüm paletler hesaplandı; başarı yeşili açık temada #17633A).
- **Geri bildirim:** başarı mesajı `toast`, hata ve onay soruları `Alert`. Basınca anında tepki: `scale 0.97` + hafif solma (`ui.tsx › s.pressed`).
- **Hareket:** kurallar ve değerler `lib/motion.ts` içinde.
  - Parmağın tuttuğu her şey yayla hareket eder ve bırakıldığı hızı korur.
  - Karar, parmağın hızıyla ulaşacağı noktaya göre verilir (fırlatma da sayılır).
  - Kenarlarda sert duruş yok, giderek artan direnç var.
  - Parmak olmayan geçişler ease-out ve 300 ms'nin altında; arayüzde ease-in kullanılmaz; `scale(0)` ile belirme yok.
- **Hareketi azalt:** açıksa kayma, zıplama ve iskelet nabzı kalkar, yalnızca kısa solma kalır (`useReducedMotion`).
- **Titreşim:** yalnızca anlamlı anlarda ve görsel geri bildirimle birlikte (`lib/haptics.ts`): favori eklendi, ilan yayına gönderildi, teklif verildi, sekme değişti.
- **120 Hz:** ProMotion ekranlarda akıcı hareket için `CADisableMinimumFrameDurationOnPhone` açık.
- **Bilinçli ayrılıklar:**
  - Uygulamada açık/koyu görünüm seçimi var; Apple uygulama içi görünüm düğmesi önermez ama kullanıcı istedi.
  - Sekmeler arası kaydırma canlandırması da kullanıcı isteği; simgeye dokununca geçiş anında olur.
