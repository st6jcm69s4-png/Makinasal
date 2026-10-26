# Makinasal mobil — tasarım dili: "ruhsat alanları"

Renkler web ile aynıdır ve değişmez: lacivert #25272D, bordo #800020, kâğıt #F6F5F3, çizgi #DDD9DC, soluk #66616A.

- **Yazı tipi:** Barlow (metin, başlık), Barlow Condensed (alan etiketleri). Yüklenemezse sistem yazı tipi.
- **Alan etiketi:** küçük, sıkı, büyük harf; değer altında büyük. `caps()` ile Türkçe büyük harf (i→İ).
- **Çizgi:** 1px ortak hücre çizgisi; kartlar 4px köşe, gölge yok. Bölüm başlığı üstte 2px lacivert çizgi (`Band`).
- **Simgeler:** Feather (emoji yok). Aktif sekme: üstte 3px bordo çubuk.
- **Bileşenler:** `Label`, `Field`, `Select`, `Btn`, `Chip`, `Band`, `FieldCell/FieldGrid` (components/ui.tsx), `ListingCard` (yıl / il şeridi).
- **Kural:** yeni ekranlar `lib/theme.ts` renklerini ve `radius=4` değerini kullanır; sabit hex yazılmaz.
