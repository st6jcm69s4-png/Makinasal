/**
 * Kullanım rehberi: uygulamanın her bölümü bir başlık, kısa açıklama ve "nasıl kullanılır" adımlarıyla.
 * Metinler Türkçe kaynak; çevirileri search-i18n.ts içinde.
 */
import type { IconName } from '../components/Icon';

export type GuideSection = { id: string; icon: IconName; title: string; intro: string; steps: string[]; go?: string; goLabel?: string };

export const GUIDE: GuideSection[] = [
  {
    id: 'home', icon: 'home', title: 'Ana sayfa',
    intro: 'Uygulamanın giriş kapısı. En üstte arama kutusu, altında kategoriler, hizmetler ve yeni ilanlar yer alır.',
    steps: [
      'Arama kutusuna marka, model veya parça numarası yazıp "Ara"ya bas.',
      'Kategori şeridinde bir makine çizimine dokunarak o kategorinin ilanlarını aç.',
      'Hizmetler bölümünden kiralık makine, operatör, çekici, açık artırma, iş ve parça taleplerine geç.',
      'Giriş yaptıysan özet satırında gelen tekliflerini, İş Ağı ilanlarını ve yayındaki ilan sayını gör.',
      'Sayfayı aşağı çekerek yenile.',
    ],
    go: '/', goLabel: 'Ana sayfayı aç',
  },
  {
    id: 'search', icon: 'search', title: 'İlanlar, arama ve filtreler',
    intro: 'Bütün satılık makine, araç, parça ve lastik ilanları burada listelenir. Arama kelime sırasını önemsemez, küçük yazım hatalarını tolere eder.',
    steps: [
      'Üstteki çiplerle kategori, il ve fiyat seç.',
      '"Filtre" ile marka, yıl, çalışma saati, takas ve teknik özellikler (tonaj, yürüyüş, kırıcı hattı gibi) ekle.',
      'Sağ üstteki düğmelerle liste ve ızgara görünümü arasında geç; seçimin hatırlanır.',
      '"Aramayı kaydet" ile aramanı kaydet; uyan yeni ilan gelince bildirim alırsın.',
      'Sıralamayı değiştir: öne çıkanlar, en yeni, fiyata göre, sana en yakın veya fiyatı düşenler önce.',
    ],
    go: '/ilanlar', goLabel: 'İlanları aç',
  },
  {
    id: 'listing', icon: 'file-text', title: 'İlan sayfası',
    intro: 'Bir ilanın tüm bilgileri: fotoğraflar, video, en önemli 6 bilgi, teknik özellikler, bakım beyanı ve satıcı.',
    steps: [
      'Fotoğrafları yana kaydırarak gez.',
      'Fiyatın yanındaki yeşil etiket fiyatın ne kadar düştüğünü gösterir.',
      '"Makine karnesi" ve "Bakım ve durum" bölümleri satıcı beyanıdır; makineyi görürken doğrula.',
      '"Ekspertiz kontrol listesi" ile makineyi yerinde madde madde kontrol et.',
      '"Nakliye tahmini" bölümünde teslim ilini ve nakliyecinin km fiyatını yazarak yaklaşık nakliye maliyetini gör.',
      'Altta sabit duran "Mesaj gönder" veya "Ara" düğmeleriyle satıcıya ulaş.',
      'Sağ üstteki düğmelerle ilanı favorilere ekle, paylaş veya karşılaştırmaya ekle.',
    ],
  },
  {
    id: 'post', icon: 'plus-circle', title: 'İlan ver',
    intro: 'Alt menünün ortasındaki koyu düğme. Makine, araç, parça veya lastik ilanı burada verilir.',
    steps: [
      'Kategoriyi seç; form o kategoriye uygun teknik alanları gösterir.',
      'Fotoğrafları ekle. Kapak yapmak istediğin fotoğrafa dokun.',
      'Başlık, fiyat, il, yıl, çalışma saati ve açıklamayı doldur.',
      'İstersen YouTube / Vimeo bağlantısı ekle. Telefondan video yükleme premium üyelere açıktır.',
      'Form yarıda kalırsa taslak telefonda saklanır, sonra kaldığın yerden devam edersin.',
      'Gönderdiğin ilan önce incelenir; onaylanınca yayına çıkar ve sana bildirim gelir.',
    ],
    go: '/ilan-ver', goLabel: 'İlan ver',
  },
  {
    id: 'mine', icon: 'list', title: 'İlanlarım',
    intro: 'Verdiğin bütün ilanlar, durumları ve performansları.',
    steps: [
      'Her ilanın altında görüntülenme, favori, mesaj ve telefon sayılarını gör.',
      '"İlan kalitesi" satırına dokunarak puanın neden böyle olduğunu ve neyi tamamlaman gerektiğini gör.',
      'Üç nokta menüsünden ilanı düzenle, satıldı yap, duraklat, kaldır veya açık artırmaya çıkar.',
      '"Makine karnesi" ile bakım kayıtlarını ekle; kayıtlar ilanında görünür.',
      '"Satılık afişi (QR kod)" ile makinenin üstüne asılacak afişi oluştur; ekran görüntüsünü alıp yazdır.',
    ],
    go: '/ilanlarim', goLabel: 'İlanlarımı aç',
  },
  {
    id: 'auction', icon: 'award', title: 'Açık artırma',
    intro: 'Satıcı ilanını belirli bir süre için açık artırmaya çıkarabilir. Teklif vermek Pro ve Firma Pro üyelere açıktır.',
    steps: [
      'Açık artırmadaki ilanlar "Açık artırma" sayfasında ve ilan sayfasında kalan süreyle görünür.',
      'Teklifin en az belirtilen artış kadar yüksek olmalıdır. Son 5 dakikada gelen teklif süreyi 5 dakika uzatır.',
      'Bitime 1 saatten fazla varken teklifini en fazla 2 kez geri çekebilir veya düşürebilirsin.',
      'Kazanırsan sana ve satıcıya bildirim gider, mesajlaşma kendiliğinden açılır.',
      'Kazanıp ödemeyen üyenin premium üyeliği iadesiz iptal edilir ve açık artırmalardan kalıcı olarak men edilir.',
    ],
    go: '/acik-artirmalar', goLabel: 'Açık artırmaları aç',
  },
  {
    id: 'messages', icon: 'message-square', title: 'Mesajlar ve teklifler',
    intro: 'Sağ üstteki konuşma balonu. Okunmamış mesaj sayısı balonun üstünde görünür.',
    steps: [
      '"İlan mesajları" sekmesinde ilanlar üzerinden yaptığın yazışmaları gör.',
      '"Teklifler" sekmesinde İş Ağı ilanlarına gelen ve gönderdiğin teklifleri yönet.',
      'Tümü, Okunmamış ve Teklifler çipleriyle listeyi süz.',
      'Rahatsız eden kullanıcıyı konuşmanın içinden engelleyebilir veya mesajı şikayet edebilirsin.',
    ],
    go: '/mesajlar', goLabel: 'Mesajları aç',
  },
  {
    id: 'favs', icon: 'heart', title: 'Favoriler ve kayıtlı aramalar',
    intro: 'Beğendiğin ilanları ve sık yaptığın aramaları sakla.',
    steps: [
      'İlan kartındaki kalbe dokunarak favorilere ekle; Hesabım → Favorilerim altından ulaş.',
      'Favorindeki ilanın fiyatı düşerse bildirim alırsın.',
      'Kayıtlı aramalar sayfasında her arama için bildirimi açıp kapatabilir, aramayı tek dokunuşla yeniden çalıştırabilirsin.',
      'İlan sayfasından en fazla 3 ilanı karşılaştırmaya ekleyip yan yana kıyasla.',
    ],
    go: '/favoriler', goLabel: 'Favorilerimi aç',
  },
  {
    id: 'network', icon: 'briefcase', title: 'İş Ağı',
    intro: 'Satış dışındaki her şey: kiralık makine, operatörlü kiralama, iş ilanları, parça talepleri, eleman ve firmalar.',
    steps: [
      'Üstteki üç kutudan amacını seç: Makine ve iş, İş arıyorum, Eleman arıyorum.',
      'İlanlara "Teklif ver" ile fiyat teklifi gönder; teklifler Mesajlar → Teklifler altında görünür.',
      'Kendi iş ilanını, kiralık makineni veya parça talebini İş Ağı içinden oluştur.',
      'İş Ağı → Hesabım altında gelen ve gönderilen teklifleri, açık ilanlarını ve firma profilini yönet.',
      'Firma profili oluşturarak makinelerini ve hizmet bölgeni tek vitrinde göster.',
    ],
    go: '/is-agi', goLabel: "İş Ağı'nı aç",
  },
  {
    id: 'tow', icon: 'truck', title: 'Çekici bul',
    intro: 'Arızalı makine veya araç için en yakın çekicileri puanlarıyla listeler.',
    steps: [
      'Konumunu kullan veya ilini seç; çekiciler mesafeye göre sıralanır.',
      'Puan ve değerlendirmelere bakarak seç, tek dokunuşla ara.',
    ],
    go: '/cekici', goLabel: 'Çekici bul',
  },
  {
    id: 'notify', icon: 'bell', title: 'Bildirimler',
    intro: 'Sağ üstteki zil. Mesaj, teklif, fiyat düşüşü, kayıtlı arama, açık artırma ve ilan onayı bildirimleri burada toplanır.',
    steps: [
      'Bir bildirime dokunarak ilgili ilana, mesaja veya teklife git.',
      'Okunmamış bildirimler vurgulu görünür.',
    ],
    go: '/bildirimler', goLabel: 'Bildirimleri aç',
  },
  {
    id: 'account', icon: 'user', title: 'Hesabım, profil ve güven',
    intro: 'Profilin, hesap güvenliğin, değerlendirmelerin ve üyeliğin.',
    steps: [
      'Adını, ilini ve mağaza bilgilerini Profili düzenle altından güncelle.',
      'Hesap güvenliği bölümünden telefonunu doğrula; doğrulanmış hesaplar alıcılara daha çok güven verir.',
      'Anlaşma tamamlanınca karşı tarafı değerlendir; aldığın puan ilanlarında görünür.',
      'Davet kodunu paylaşarak arkadaşlarını davet et.',
    ],
    go: '/hesap', goLabel: 'Hesabımı aç',
  },
  {
    id: 'premium', icon: 'star', title: 'Premium üyelik',
    intro: 'Pro ve Firma Pro üyelikler daha fazla ilan hakkı, öne çıkma, video yükleme ve açık artırmada teklif verme sağlar.',
    steps: [
      'Hesabım → Üyelik ve ilan hakları altından planları karşılaştır.',
      'Ödeme sistemi açılınca satın alma bu sayfadan yapılacak.',
    ],
    go: '/premium', goLabel: 'Planları gör',
  },
  {
    id: 'settings', icon: 'settings', title: 'Ayarlar',
    intro: 'Dil, görünüm ve renk teması.',
    steps: [
      'Dil: Türkçe, İngilizce veya Almanca seç.',
      'Görünüm: açık, koyu veya telefonun ayarına göre.',
      'Renk teması: Petrol yeşili veya Bordo. Değişiklik uygulama yeniden başlayınca geçerli olur.',
    ],
    go: '/ayarlar', goLabel: 'Ayarları aç',
  },
  {
    id: 'tips', icon: 'zap', title: 'Kısayollar',
    intro: 'Uygulamayı daha hızlı kullanmanın yolları.',
    steps: [
      'Ana sayfa, İlanlar, İş Ağı ve Hesabım arasında sağa veya sola kaydırarak geç.',
      'Herhangi bir sayfada boş bir yere art arda iki kez dokununca arama açılır.',
      'Açık olan sekmeye tekrar dokununca sayfa en üste çıkar.',
      'Listeleri aşağı çekerek yenile.',
    ],
  },
  {
    id: 'safe', icon: 'shield', title: 'Güvenli alım',
    intro: 'Dolandırıcılığa karşı temel kurallar.',
    steps: [
      'Makineyi görmeden kapora, ön ödeme, havale veya EFT gönderme.',
      'Seri / şasi numarasını belgelerle karşılaştır; rehin ve haciz kaydını sorgula.',
      'Ödemeyi mümkünse noter veya banka üzerinden yap.',
      'Şüpheli ilanı veya mesajı şikayet et; ekibimiz inceler.',
    ],
    go: '/guven', goLabel: 'Güven rehberini aç',
  },
];
