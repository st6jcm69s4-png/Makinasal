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
