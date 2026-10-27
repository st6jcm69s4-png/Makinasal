// Makinasal hukuki metinleri (Türkçe, bağlayıcı sürüm).
// ÖNEMLİ: Bu metinler yaygın ilan/pazaryeri sözleşmelerinin yapısı ve KVKK Aydınlatma Yükümlülüğü Tebliği esas alınarak hazırlanmıştır.
// Yayınlanmadan önce bir avukat tarafından incelenmelidir. {{unvan}}, {{adres}}, {{eposta}} alanları LEGAL_OPERATOR_* ortam değişkenlerinden gelir.
export const LEGAL_VERSION = '2026-10-27';
export const LEGAL_VERSION_LABEL = '27 Ekim 2026';

export type LegalSlugTr = 'kvkk' | 'kullanim' | 'cerez' | 'satis' | 'ilan-kurallari';
export type LegalDoc = { title: string; intro?: string; sections: [string, string[]][] };

export const LEGAL_TR: Record<LegalSlugTr, LegalDoc> = {
  kullanim: {
    title: 'Kullanım Koşulları ve Üyelik Sözleşmesi',
    intro: 'Makinasal’ı kullanarak veya üye olarak aşağıdaki koşulları kabul etmiş olursun. Lütfen dikkatle oku.',
    sections: [
      ['1. Taraflar ve tanımlar', [
        'Bu sözleşme, {{unvan}} ({{adres}}, {{eposta}}) (“Makinasal”) ile Makinasal web sitesini ve mobil uygulamasını (“Platform”) kullanan veya üye olan kişi (“Kullanıcı”) arasında kurulur.',
        'Platform; iş makinesi, kamyon, ağır vasıta ve benzeri araçların, bunların yedek parça, lastik ve ekipmanlarının ilanlarının yayımlandığı; ayrıca iş ağı (iş ve eleman ilanları, firma profilleri, çekici ve yol yardım dahil hizmet sağlayıcılar) bölümlerini içeren bir çevrim içi ilan ve iletişim platformudur.',
      ]],
      ['2. Makinasal’ın rolü', [
        'Makinasal, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun anlamında aracı hizmet sağlayıcı ve yer sağlayıcıdır. İlanlardaki mal veya hizmetin satıcısı, kiralayanı ya da sağlayıcısı değildir; alıcı ile satıcı arasındaki sözleşmenin tarafı değildir.',
        'Makinasal; ilan konusu aracın veya ürünün mülkiyetini, durumunu, kilometre/çalışma saatini, hasar ve borç durumunu, belgelerini, ilan sahibinin kimliğini ya da yetkisini garanti etmez. Bu hususları işlemden önce kendi imkânlarınla doğrulaman gerekir.',
        'Makinasal, ilanlar ve mesajlar üzerinden yapılan işlemlerde ödemeyi tahsil etmez veya emanet olarak tutmaz (bkz. “Satış ve Ödeme Bilgileri”).',
      ]],
      ['3. Üyelik', [
        'Üye olmak için 18 yaşını doldurmuş olmalı ve fiil ehliyetine sahip olmalısın. Tüzel kişiler ve işletmeler yetkili temsilcileri aracılığıyla üye olabilir.',
        'Üyelik sırasında verdiğin ad, e-posta, telefon ve bölge bilgilerinin doğru ve güncel olması gerekir. Makinasal güvenlik amacıyla e-posta veya telefon doğrulaması isteyebilir.',
        'Hesabının ve şifrenin güvenliğinden sen sorumlusun. Hesabında yetkisiz bir kullanım fark edersen gecikmeden bildir. Bir kişi birden fazla hesapla ilan veremez veya yasaklı bir hesabı yeniden açamaz.',
        'Ticari faaliyet kapsamında ilan veren kullanıcılar (tacir, esnaf, şirket) ticari kimlik ve vergi bilgilerini doğru beyan etmekle ve mevzuattan doğan yükümlülüklerini (fatura, ticari reklam, tüketici mevzuatı vb.) yerine getirmekle yükümlüdür.',
      ]],
      ['4. İlan verme ve içerik', [
        'İlanlarda yer alan bilgiler, fotoğraflar ve fiyat doğru, güncel ve aldatıcı olmayan nitelikte olmalıdır. Yalnızca satmaya, kiralamaya veya devretmeye yetkili olduğun ürünler için ilan verebilirsin.',
        'Fotoğraf, metin ve diğer içeriklerin yayımlama hakkına sahip olmalısın. Başkasına ait fotoğrafı izinsiz kullanamazsın. İlana kişisel verileri (kimlik, plaka dışı tescil belgeleri, banka kartı bilgileri vb.) koyma.',
        'Yayımladığın içerik için Makinasal’a, hizmetin sunulması ve tanıtımı amacıyla sınırlı, münhasır olmayan, süre ve yer sınırı olmayan ve ücretsiz bir kullanım izni vermiş olursun. İçeriğin mülkiyeti sende kalır.',
        'Ayrıntılı kurallar ve yasaklı ilanlar için “İlan Yayınlama Kuralları” sayfasına bak.',
      ]],
      ['5. Yasaklı davranışlar', [
        'Aşağıdakiler yasaktır: dolandırıcılık ve yanıltıcı ilan; sahte kimlik veya firma bilgisi; kapora, ön ödeme ya da kart/IBAN bilgisi toplamaya yönelik girişimler; küfür, hakaret, tehdit ve taciz; izinsiz toplu veya reklam amaçlı mesaj; başkalarının kişisel verilerini izinsiz paylaşma; sahte değerlendirme veya puan manipülasyonu; Platform’un güvenliğini, sınırlarını veya erişimini aşmaya çalışan otomatik araçlar; hukuka aykırı veya çalıntı mal ilanı.',
        'Bu eylemler hesabın kısıtlanması, ilanın kaldırılması, hesabın kapatılması ve gerektiğinde yetkili makamlara bildirilmesi sonucunu doğurabilir.',
      ]],
      ['6. Mesajlaşma, teklif ve iletişim', [
        'Platform üzerinden mesaj, teklif ve talep gönderebilirsin. Mesajlar yalnızca görüşmenin tarafları tarafından görülür; ancak şikayet, güvenlik veya hukuki yükümlülük halinde incelenebilir.',
        'Telefon numaraları yalnızca giriş yapmış kullanıcılara, ilan sahibinin veya firmanın paylaşımına bağlı olarak gösterilir. Başkasının numarasını izinsiz pazarlama, tacize veya üçüncü kişilerle paylaşmaya yönelik kullanamazsın.',
        'Tanımadığın kişilere platform dışında kapora veya ön ödeme göndermemeni; aracı/ürünü görmeden, ruhsat–şasi–seri numarası ve noter/trafik tescil işlemlerini doğrulamadan ödeme yapmamanı öneririz.',
      ]],
      ['7. İş ağı, çekici ve hizmet sağlayıcılar', [
        'İş ağı bölümündeki iş talepleri, eleman ilanları, firma profilleri ve çekici/yol yardım kayıtları ilgili kullanıcıların kendi beyanıdır. Makinasal bu kişilerin işvereni, acentesi veya hizmet sağlayıcısı değildir; hizmetin kalitesi, fiyatı, süresi ve sonucundan sorumlu değildir.',
        'Eleman ilanlarında başvuru, kayıt veya işe alım adı altında ücret talep edilemez. Bu tür bir talep gördüğünde ilanı şikayet et.',
        '“Çekici bul” özelliğinde gösterilen yakınlık sıralaması, kullandığın konuma ve firmaların bildirdiği il/ilçe bilgisine dayanan bir yardımcıdır; müsaitlik, süre veya hizmet garantisi vermez. Acil durumlarda 112’yi ara.',
      ]],
      ['8. Değerlendirme ve puanlar', [
        'Kullanıcılar birbirini ve firmaları değerlendirebilir. Değerlendirmeler gerçek bir deneyime dayanmalı, hakaret veya yanıltıcı içerik taşımamalıdır. Hukuka aykırı, sahte veya suistimal şüphesi taşıyan değerlendirmeler kaldırılabilir.',
      ]],
      ['9. Şikayet, moderasyon ve içerik kaldırma', [
        'Hukuka veya bu koşullara aykırı olduğunu düşündüğün içerik için ilan veya profil sayfasındaki “Şikayet et” seçeneğini kullanabilir ya da {{eposta}} adresine yazabilirsin. Bildirimler makul süre içinde incelenir.',
        'Makinasal; hukuka aykırı içeriği haberdar olduğunda veya yetkili makam talebi halinde kaldırma, ilan veya hesabı askıya alma, ilan geçmişini saklama haklarını saklı tutar. Karar hakkında itiraz için aynı iletişim kanalını kullanabilirsin.',
      ]],
      ['10. Ücretler', [
        'Platform’un güncel sürümünde ilan verme ve gezme ücretsiz olabilir; ücretli paket, ek ilan hakkı veya mağaza özellikleri sunulacağı zaman fiyat, vergiler, süre ve cayma/iptal koşulları satın alma öncesinde açıkça gösterilir ve ayrıca onayına sunulur.',
        'Davet programı gibi kampanyalarla kazanılan ilan hakları nakde çevrilemez, devredilemez ve kötüye kullanılması halinde iptal edilir.',
      ]],
      ['11. Fikri mülkiyet', [
        'Platform’un yazılımı, tasarımı, markası, logosu ve içerik düzeni Makinasal’a veya lisans verenlerine aittir. Yazılı izin olmadan kopyalanamaz, çoğaltılamaz, tersine mühendislik yapılamaz veya otomatik araçlarla toplu veri çekilemez.',
      ]],
      ['12. Sorumluluğun sınırı', [
        'Makinasal, kesintisiz veya hatasız hizmet vermeyi hedefler; ancak bakım, güvenlik, üçüncü taraf hizmetleri veya mücbir sebepler nedeniyle erişim kesintileri olabilir.',
        'Kullanıcılar arasındaki işlemlerden, ilan içeriklerinin doğruluğundan ve kullanıcıların birbirine verdiği zararlardan Makinasal, kanunen sorumlu tutulabileceği haller saklı kalmak üzere sorumlu değildir. Zorunlu tüketici hakları ve kasıt veya ağır ihmalden doğan sorumluluk bu koşullarla sınırlandırılamaz.',
      ]],
      ['13. Kişisel veriler', [
        'Kişisel verilerin işlenmesi “KVKK Aydınlatma Metni”nde, çerez ve benzeri teknolojiler “Çerez Politikası”nda açıklanmıştır.',
      ]],
      ['14. Değişiklikler ve fesih', [
        'Makinasal bu koşulları ve Platform özelliklerini değiştirebilir. Önemli değişiklikler Platform üzerinden duyurulur; değişiklikten sonra Platform’u kullanmaya devam etmen güncel koşulları kabul ettiğin anlamına gelir.',
        'Üyeliğini istediğin zaman kapatabilirsin. Makinasal da bu koşulların ihlali halinde üyeliği askıya alabilir veya sonlandırabilir. Yasal saklama yükümlülükleri saklıdır.',
      ]],
      ['15. Uygulanacak hukuk ve uyuşmazlıklar', [
        'Bu sözleşmeye Türk hukuku uygulanır. Tüketici sıfatıyla yaşanan uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Diğer uyuşmazlıklarda işletmecinin yerleşim yerindeki mahkemeler ve icra daireleri yetkilidir.',
      ]],
    ],
  },

  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    intro: '6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) m.10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca hazırlanmıştır.',
    sections: [
      ['1. Veri sorumlusu', [
        'Veri sorumlusu {{unvan}}’dır. Adres: {{adres}}. İletişim ve başvuru: {{eposta}}.',
      ]],
      ['2. İşlenen kişisel veriler', [
        'Kimlik ve iletişim: ad soyad, e-posta, telefon, kullanıcı adı. Konum/bölge: il, ilçe; çekici bulma özelliğinde izin verirsen cihaz konumu. Profil: biyografi, mağaza veya firma adı, profil görseli, vergi/ticari bilgiler (ticari üyelerde).',
        'İşlem ve içerik: ilanlar, fotoğraflar, fiyat ve ürün bilgileri, favoriler, kayıtlı aramalar, teklif ve talepler, mesajlar, değerlendirmeler, şikayetler, davet kodu ve davet kayıtları, bildirimler.',
        'İşlem güvenliği ve teknik: oturum bilgileri, IP adresi, cihaz ve uygulama sürümü, hata ve güvenlik kayıtları (log), şüpheli işlem ve kötüye kullanım kayıtları. Ödeme hizmeti etkinleştirildiğinde ödeme sağlayıcıdan gelen işlem özeti; kart numarası Makinasal’da saklanmaz.',
      ]],
      ['3. İşleme amaçları', [
        'Üyelik oluşturma, kimlik ve hesap doğrulama; ilan yayımlama, arama, favori, mesajlaşma ve teklif hizmetlerinin sunulması; iş ağı ve çekici bulma özelliklerinin yürütülmesi; müşteri destek taleplerinin yanıtlanması; şikayet ve moderasyon süreçlerinin yürütülmesi; dolandırıcılık, kötüye kullanım ve güvenlik risklerinin önlenmesi; mevzuattan doğan yükümlülüklerin yerine getirilmesi; hizmetin geliştirilmesi (yalnızca izin verdiğin ölçüm çerezleri ile).',
      ]],
      ['4. Hukuki sebepler', [
        'Verilerin işlenmesi; sözleşmenin kurulması veya ifası (KVKK m.5/2-c), hukuki yükümlülüğün yerine getirilmesi (m.5/2-ç), bir hakkın tesisi, kullanılması veya korunması (m.5/2-e) ve temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (m.5/2-f; örn. bilgi güvenliği ve dolandırıcılık önleme) sebeplerine dayanır.',
        'Cihaz konumu, ticari elektronik ileti ve isteğe bağlı ölçüm çerezleri gibi işlemler yalnızca açık rızana dayanır; rızanı istediğin zaman geri alabilirsin. Geri alma, öncesindeki işlemlerin hukuka uygunluğunu etkilemez.',
      ]],
      ['5. Toplama yöntemi', [
        'Veriler; üyelik ve profil formları, ilan ve mesaj ekranları, mobil uygulama ve web sitesi kullanımı, destek ve şikayet kanalları aracılığıyla elektronik ortamda, otomatik veya kısmen otomatik yöntemlerle toplanır.',
      ]],
      ['6. Verilerin aktarımı', [
        'Yurt içi ve yurt dışı hizmet sağlayıcılar: barındırma ve veritabanı (Supabase; veritabanı Avrupa Birliği/Frankfurt bölgesindedir), web barındırma, e-posta ve SMS gönderimi, bot koruması (Cloudflare Turnstile), hata izleme ve — ödeme açıldığında — ödeme kuruluşu (iyzico). Bu sağlayıcılar yalnızca Makinasal adına ve talimatlarımız kapsamında veri işler.',
        'Diğer kullanıcılar: ilan ve profil bilgilerin, yayımlamayı seçtiğin kapsamda diğer ziyaretçilere görünür; mesajların yalnızca görüşmenin taraflarına gösterilir; telefon numaran giriş yapmış kullanıcılara yalnızca paylaşmayı seçtiğin ölçüde gösterilir.',
        'Resmî mercilere: mahkeme, savcılık, kolluk ve düzenleyici kurumlar tarafından mevzuata uygun talep edilmesi halinde.',
        'Yurt dışına aktarım yapılması halinde KVKK m.9 kapsamında öngörülen güvencelerden (yeterlilik kararı, standart sözleşme, bağlayıcı şirket kuralları veya Kanun’da sayılan diğer yöntemler) biri uygulanır.',
      ]],
      ['7. Saklama süresi', [
        'Verileri, işleme amacının gerektirdiği süre ve ilgili mevzuatta öngörülen saklama süreleri boyunca saklarız (örneğin erişim kayıtları için 5651 sayılı Kanun’daki süreler). Hesabını kapattığında hesap verilerin, yasal saklama yükümlülüğü ve olası uyuşmazlıklar için gerekli olanlar dışında silinir veya anonim hale getirilir. Süre sonunda veriler silinir, yok edilir veya anonimleştirilir.',
      ]],
      ['8. Hakların (KVKK m.11)', [
        'Veri sorumlusuna başvurarak şunları talep edebilirsin: kişisel verinin işlenip işlenmediğini öğrenme; işlenmişse buna ilişkin bilgi isteme; işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme; yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme; eksik veya yanlış işlenmişse düzeltilmesini isteme; KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme; bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme; münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme; kanuna aykırı işlenmesi sebebiyle zarara uğranması halinde zararın giderilmesini talep etme.',
      ]],
      ['9. Başvuru yolu', [
        'Başvurunu uygulamada Hesabım → Hukuki bilgiler ve veri haklarım → Veri haklarım bölümünden veya {{eposta}} adresine kimliğini doğrulayacak şekilde yazılı olarak iletebilirsin. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca maliyet gerektirmesi halinde Kurul tarafından belirlenen tarife esas alınabilir.',
        'Başvurunun reddedilmesi, yanıtı yetersiz bulman veya süresinde yanıt verilmemesi halinde, öğrenme tarihinden itibaren 30 gün ve her halde başvuru tarihinden itibaren 60 gün içinde Kişisel Verileri Koruma Kurulu’na şikayette bulunabilirsin.',
      ]],
    ],
  },

  cerez: {
    title: 'Çerez Politikası',
    intro: 'Bu politika, web sitesinde ve mobil uygulamada kullanılan çerez ve benzeri depolama teknolojilerini açıklar.',
    sections: [
      ['1. Çerez nedir?', [
        'Çerezler ve cihaz depolaması (localStorage vb.), siteyi veya uygulamayı kullanırken tarayıcında veya cihazında saklanan küçük veri parçalarıdır.',
      ]],
      ['2. Zorunlu depolama', [
        'Oturum: Giriş yaptığında hesabını tanımak için kimlik doğrulama çerezleri (web) veya güvenli oturum belirteci (mobil uygulama) kullanılır. Bunlar olmadan giriş yapılamaz; rıza gerektirmez.',
        'Dil tercihi: makinasal-language adlı çerez seçtiğin dili en fazla bir yıl saklar.',
        'Cihaz tercihi: misafir favorileri, karşılaştırma seçimleri, kayıtlı aramalar ve çerez tercihin cihazında saklanır; sen silene veya değiştirene kadar kalır.',
        'Güvenlik: formlarda bot koruması için Cloudflare Turnstile kullanılabilir; kötüye kullanımı önlemek amacıyla ağ isteklerinde IP adresi işlenebilir.',
      ]],
      ['3. İsteğe bağlı ölçüm', [
        'Ölçüm ve analitik, yalnızca sen izin verirsen ve bir ölçüm hizmeti yapılandırılmışsa etkinleşir. Reklam amaçlı izleyici veya üçüncü taraf reklam çerezi yüklenmez. Tercihini aşağıdaki bölümden istediğin zaman değiştirebilirsin; zorunlu depolama bundan etkilenmez.',
      ]],
      ['4. Üçüncü taraf istekleri', [
        'Yazı tipleri ve görseller, yapılandırılmış hizmet sağlayıcılardan (örneğin Google Fonts, depolama hizmeti) istenebilir. Bu istekler IP adresini iletebilir ve isteğe bağlı ölçüm çerezinden ayrıdır.',
      ]],
      ['5. Nasıl kontrol edersin?', [
        'Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsin; bu durumda oturumun kapanabilir ve bazı özellikler çalışmayabilir. Mobil uygulamada uygulama verisini silmek veya çıkış yapmak yerel depolamayı temizler.',
      ]],
    ],
  },

  satis: {
    title: 'Satış ve Ödeme Bilgileri',
    intro: 'Bu sayfa Platform üzerindeki ödeme, satış ve tüketici haklarına ilişkin genel bilgilendirmedir.',
    sections: [
      ['1. Mevcut durum', [
        'Makinasal şu an ödeme tahsil etmez, emanet para tutmaz ve ödeme aracılığı yapmaz. İlanlar üzerinden yapılan alım-satım, kiralama ve hizmet anlaşmaları doğrudan kullanıcılar arasında kurulur.',
        'Platform adına kapora, ön ödeme veya “komisyon” isteyen mesajlara itibar etme; ilan, mesaj veya teklif alanlarına kart ve banka bilgisi yazma. Şüpheli durumu “Şikayet et” ile bildir.',
      ]],
      ['2. Alıcı için öneriler', [
        'Aracı/ürünü görmeden ödeme yapma. Ruhsat, şasi/seri numarası, rehin–haciz–borç durumu ve satıcının kimliği ile yetkisini doğrula. Motorlu taşıt satışlarında satış, yürürlükteki mevzuata uygun noter veya yetkili işlem yoluyla yapılmalıdır.',
        'Ödemeyi mümkünse banka havalesi ile ve satıcının kimliğiyle uyumlu hesaba yap; nakit ve elden kapora tutarlarında yazılı makbuz al.',
      ]],
      ['3. Satıcı için öneriler', [
        'Ödeme hesabına geçmeden aracı/ürünü teslim etme. Ticari satıcılar fatura, garanti ve tüketici mevzuatından doğan bilgilendirme yükümlülüklerini yerine getirmelidir.',
      ]],
      ['4. Tüketici hakları ve cayma', [
        '6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ticari satıcıdan mesafeli sözleşme ile yapılan alışverişlerde cayma hakkı, yasal istisnalar saklı kalmak üzere teslimden itibaren 14 gündür. Bireysel (tacir olmayan) kişiler arasındaki ikinci el satışlarda tüketici mevzuatındaki cayma hakkı kendiliğinden doğmaz; ayıp ve diğer genel hükümler uygulanır.',
        'Makinasal’ın kendisinin sunacağı ücretli hizmetler (ör. mağaza paketi, ilan hakkı) başlatıldığında; satıcı kimliği, toplam fiyat ve vergiler, ödeme ve ifa şartları, cayma ve iptal koşulları satın alma öncesinde ön bilgilendirme formu ve mesafeli sözleşme ile sunulacaktır.',
      ]],
      ['5. Uyuşmazlıklar', [
        'Tüketici işlemlerinde parasal sınırlar dahilinde Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine başvurabilirsin. Makinasal’a bildirimlerin için: {{eposta}}.',
      ]],
    ],
  },

  'ilan-kurallari': {
    title: 'İlan Yayınlama Kuralları',
    intro: 'İlanların güvenilir kalması için tüm ilanlar bu kurallara uymalıdır. Kurallara aykırı ilanlar uyarı yapılmaksızın kaldırılabilir.',
    sections: [
      ['1. Doğru ve eksiksiz bilgi', [
        'Marka, model, yıl, kilometre/çalışma saati, durum, hasar ve kusur bilgilerini doğru yaz. Fiyat ilanın gerçek fiyatı olmalı; “son fiyat”, “takas”, “pazarlık payı” gibi koşullar açık belirtilmeli.',
        'Fotoğraflar ilan konusu ürüne ait olmalı. Başka ilandan alınmış, stok veya yanıltıcı fotoğraf kullanılamaz.',
      ]],
      ['2. Kişisel veri ve belgeler', [
        'İlan metnine veya fotoğrafa kimlik belgesi, banka kartı, IBAN, şifre ve benzeri hassas bilgi koyma. Ruhsat fotoğrafı paylaşıyorsan kişisel bilgileri kapat.',
      ]],
      ['3. Yasaklı ilanlar', [
        'Çalıntı, kaçak, sahte belgeli veya sahibi belli olmayan mallar; hurda–parça adı altında çalıntı parça; kaçak akaryakıt, silah, patlayıcı ve yasa dışı maddeler; sahte veya taklit marka ürünler; mevzuatla satışı yasaklanan veya özel izin gerektiren ürünler; hizmet bedeli karşılığında iş vaat eden sahte iş ilanları; kullanıcıları platform dışı ödemeye veya dolandırıcılığa yönlendiren ilanlar yasaktır.',
      ]],
      ['4. Kategoriler ve tekrar', [
        'İlanı doğru kategoride yayımla. Aynı ürünü birden çok kez, farklı hesaplarla veya farklı fiyatlarla yayımlama. Kategoriyle ilgisiz anahtar kelime yığma yapma.',
      ]],
      ['5. İş ağı ilanları', [
        'Eleman ilanlarında iş tanımı, çalışma yeri ve (mümkünse) ücret aralığı gerçek olmalı; başvuru için kullanıcıdan ücret istenemez. İş arayan ilanlarında kişisel bilgiler yalnızca gerekli olduğu kadar paylaşılmalıdır. Çekici ve hizmet sağlayıcılar, sundukları hizmeti, bölgelerini ve iletişim bilgilerini doğru beyan etmelidir.',
      ]],
      ['6. İhlal ve yaptırımlar', [
        'Kurallara aykırı ilanlar kaldırılabilir; tekrarlanan veya ağır ihlaller hesabın kısıtlanmasına veya kapatılmasına yol açabilir. Hukuka aykırı bir ilan görürsen ilan sayfasındaki “Şikayet et” seçeneğini kullan.',
      ]],
    ],
  },
};

export function fillLegal(text: string, id: { name: string; address: string; email: string }) {
  return text
    .replaceAll('{{unvan}}', id.name || '[ŞİRKET UNVANI]')
    .replaceAll('{{adres}}', id.address || '[ADRES]')
    .replaceAll('{{eposta}}', id.email || '[E-POSTA]');
}
