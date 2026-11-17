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
- **Titreşim:** yalnızca anlamlı anlarda ve görsel geri bildirimle birlikte (`lib/haptics.ts`): favori eklendi, ilan yayına gönderildi, teklif verildi.
- **120 Hz:** ProMotion ekranlarda akıcı hareket için `CADisableMinimumFrameDurationOnPhone` açık.
- **Bilinçli ayrılıklar:**
  - Uygulamada açık/koyu görünüm seçimi var; Apple uygulama içi görünüm düğmesi önermez ama kullanıcı istedi.

## Telefonun kendi parçaları (16 Kasım 2026)
- **Alt menü:** `NativeTabs` (`app/(tabs)/_layout.tsx`). iOS 26'da cam görünümlü sistem çubuğu (kaydırınca küçülmez; küçülürken listeler zıplıyordu), Android'de Material 3. Simgeler iPhone'da SF Symbols, Android'de Material Symbols. "İlan ver" bir sekmedir ve ilan türünü seçtiren sayfayı açar (sekmeler eylem yapmaz). Sekmeler arası parmakla kaydırma kullanıcı isteğiyle duruyor (`SwipeTabs`, beş sekmenin hepsinde; simgeye dokununca anında geçer).
- **Başlıklar:** her yerde telefonun kendi başlık çubuğu (`lib/nav.ts › headerOptions`). Başlıklar normal yazımla, büyük harfle değil. Geri düğmesi: iPhone'da telefonun kendi geri düğmesi ve sistem başlık düğmeleri (`unstable_headerLeftItems`, SF Symbols); kendi çizdiğimiz düğme iOS 26 cam zemininde boş daire görünüyor ve basmayı almıyordu. Android'de `components/BackButton.tsx`.
- **Büyük başlık:** İlan ver, Hesabım, Mesajlar, Favorilerim. Kaydırınca küçülüp çubuğa yerleşir. Yalnızca ilk öğesi sade bir kaydırma listesi olan ekranlarda açılır ve o listede `contentInsetAdjustmentBehavior="automatic"` olmalıdır; yoksa içerik başlığın altında kalır. İlanlar ve İş Ağı'nda (arama kutusu, bölüm seçici) denendi: içerik başlığın altında kaldı ve liste yüklenirken kaydı, bu yüzden orada normal başlık var.
- **İlan seçenekleri (İlanlarım):** iPhone'da sistemin kendi eylem sayfası (`ActionSheetIOS`), Android'de alttan açılan sayfa.
- **Başlık düğmeleri:** sekmelerde sağda arama, bildirimler, mesajlar (`HeaderButtons`, okunmamış sayısı `lib/unread.ts`). Ana sayfada marka başlığı (`HomeHeader`); marka yalnızca orada.
- **Gruplu satırlar:** `components/Rows.tsx`, iPhone Ayarlar düzeni: gölgesiz beyaz kart, renkli kare simge, ince ara çizgi, basınca gri satır, kırmızı "Çıkış yap" satırı. Hesabım, İlan ver ve Hukuki bilgiler bunu kullanır.
- **İlan kartında uzun basma:** iPhone'da ilanın önizlemesi ve sistem menüsü (Favori, Karşılaştır, Paylaş: `Link.Preview` + `Link.Menu`). Android'de aynı seçenekler pencerede.
- **Ortak parçalar (Apple düzeni):** düğmeler 14 köşe, ikincil düğme çerçevesiz açık zeminli, tehlikeli düğme açık kırmızı zeminli; giriş kutuları ince çizgili; `common.card` gölgesiz; `Tabs variant="filled"` iPhone bölümlü seçicisi (gri zemin, seçili parça beyaz). Ayarlar ekranı da gruplu satır düzeninde.
- **İlanlar kayması:** arama ve filtreler listenin üstünde sabit, otomatik alt boşluk yalnızca listeye (`disableAutomaticContentInsets` + listede `contentInsetAdjustmentBehavior="automatic"`), sekme çubuğu kaydırınca küçülmez.
- **Yazı tipi:** her yerde Inter (`font.bold`, `label` vb. de Inter'e bağlı). Barlow yalnızca logodaki MAKİNASAL yazısında (`font.brand`).
- **En üste çık:** Ana sayfada logoya, diğer sekmelerde başlığa dokununca liste başa döner (`fireScrollTop`). Açık sekmenin simgesine tekrar dokunmak da beş sekmede aynısını yapar (`NativeTabs screenListeners › tabPress`); iPhone'da saate dokunmak da.
- **Sekmeler arası geri:** uygulama içi bir bağlantı başka sekmeyi açtığında (ör. Ana sayfa → "Tümü" → İlanlar) o sekmenin sol üstünde geldiğin sekmeye dönen geri düğmesi çıkar (`lib/tabBack.ts › openTab`). Alt çubuktan ya da kaydırarak geçişte çıkmaz. Sekmeye giden yeni bağlantılar `router.navigate` yerine `openTab` kullanır.
- **Yatay şeritler ve sekme kaydırma:** Ana sayfadaki yatay şeritler (kategoriler, vitrin, il ilanları) `NoSwipe` içinde; parmak oradayken sağa/sola kaydırmak sekme değiştirmez. Sekmeler arası geri düğmesi de kaydırmadaki canlandırmayla geçer.
- **"Daha fazla" (…) menüsü:** `components/MoreMenu` — iPhone'da sistemin kendi açılır menüsü (SwiftUI `Menu`), Android'de düğmenin altından açılan küçük kart. Ekranı kaplamaz; tehlikeli seçenek kırmızı ve en altta. İlanlarım'da kullanılıyor.
- **Çekici bul:** 112 uyarısı en üstte kendi kartında (kırmızı simge + "112" düğmesi); konum ve il seçimi gruplu satırlarda; çekici kartları gölgesiz, Ara dolu, Firma sayfası açık zeminli düğme.
- **Yenileme göstergesi:** yalnızca kullanıcı elle aşağı çekince görünür; sayfaya geri dönüşteki sessiz yenilemede görünmez.
