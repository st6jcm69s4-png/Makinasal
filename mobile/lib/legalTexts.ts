// Web lib/legalTexts.ts dosyasının kopyası. Metin değişince iki dosyayı birlikte güncelle.
// Makinasal hukuki metinleri (Türkçe, bağlayıcı sürüm).
// ÖNEMLİ: Bu metinler yaygın ilan/pazaryeri sözleşmelerinin yapısı ve KVKK Aydınlatma Yükümlülüğü Tebliği esas alınarak hazırlanmıştır.
// Yayınlanmadan önce bir avukat tarafından incelenmelidir. {{unvan}}, {{adres}}, {{eposta}} alanları LEGAL_OPERATOR_* ortam değişkenlerinden gelir.
export const LEGAL_VERSION = '2026-11-13';
export const LEGAL_VERSION_LABEL = '13 Kasım 2026';

export type LegalSlugTr = 'kvkk' | 'kullanim' | 'cerez' | 'satis' | 'ilan-kurallari' | 'acik-artirma' | 'premium-on-bilgi' | 'premium-sozlesme';
export type LegalDoc = { title: string; intro?: string; sections: [string, string[]][] };

export const LEGAL_TR: Record<LegalSlugTr, LegalDoc> = {
  kullanim: {
    title: 'Kullanım Koşulları ve Üyelik Sözleşmesi',
    intro: 'Makinasal’ı kullanarak veya üye olarak aşağıdaki koşulları kabul etmiş olursun. Lütfen dikkatle oku.',
    sections: [
      ['1. Taraflar ve tanımlar', [
        'Bu sözleşme, {{unvan}} ({{adres}}, {{eposta}}) (“Makinasal”) ile Makinasal web sitesini ve mobil uygulamasını (“Platform”) kullanan veya üye olan kişi (“Kullanıcı”) arasında kurulur.',
        'Platform; iş makinesi, kamyon, ağır vasıta ve benzeri araçların, bunların yedek parça, lastik ve ekipmanlarının ilanlarının yayımlandığı; ayrıca iş ağı (kiralık makine, operatör, iş ve eleman ilanları, parça talepleri, firma profilleri, çekici ve yol yardım dahil hizmet sağlayıcılar) ve açık artırma bölümlerini içeren bir çevrim içi ilan ve iletişim platformudur.',
        '“Premium üye”; Pro veya Firma Pro üyelik satın almış ve üyeliği süresi dolmamış kullanıcıdır. Ücretli üyeliğin koşulları ayrıca “Premium Üyelik Ön Bilgilendirme Formu” ve “Premium Üyelik Mesafeli Hizmet Sözleşmesi”nde düzenlenir.',
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
        'Değerlendirmeyi yazan kullanıcı premium üye ise değerlendirmenin yanında bu durum (“Pro üye tarafından değerlendirildi” gibi) gösterilebilir. Bu ibare yalnızca yazanın üyelik türünü belirtir; değerlendirmenin doğruluğu, ağırlığı veya puan hesabı üzerinde etkisi yoktur.',
        'Güven düzeyi, doğrulama rozetleri ve puanlar satın alınamaz. Premium üyelik, ilanların sıralamasını ve görünürlüğünü etkileyebilir; ancak güven puanını ve değerlendirmeleri etkilemez.',
      ]],
      ['8/A. Satıcı beyanları ve yardımcı araçlar', [
        'İlan sayfasındaki teknik bilgiler, “Bakım ve durum” bölümü ve “Makine karnesi” (bakım kayıtları) ilan sahibinin kendi beyanıdır. Makinasal bu bilgileri doğrulamaz; bilgiler ilanda “Satıcı beyanı” olarak gösterilir. Yanlış veya yanıltıcı beyanın sorumluluğu ilan sahibine aittir.',
        'Platform’da sunulan ekspertiz kontrol listesi, nakliye tahmini, kredi/leasing hesaplayıcı, benzer ilanlar ve fiyat karşılaştırması, fiyat göstergesi ve ilan kalite puanı yalnızca bilgilendirme amaçlı yardımcı araçlardır. Bu araçlar uzman ekspertizi, nakliye teklifi, finansman teklifi veya değerleme raporu yerine geçmez; sonuçları kesin değildir.',
        'Ekspertiz kontrol listesindeki işaretlerin ve nakliye tahmininde girilen il ile km fiyatı yalnızca kullanıcının kendi cihazında saklanır ve sunucuya gönderilmez.',
        '“Satılık afişi” ile üretilen QR kod yalnızca ilgili ilanın bağlantısını içerir. Afişin basılması ve asılması ilan sahibinin sorumluluğundadır; afişin asıldığı yer ve kişisel bilgi içermemesi ilan sahibince sağlanmalıdır.',
      ]],
      ['8/B. Açık artırma', [
        'İlan sahipleri ilanlarını belirli bir süre için açık artırmaya çıkarabilir. Açık artırmaya teklif vermek yalnızca premium üyelere açıktır. Ayrıntılı kurallar “Açık Artırma Kuralları” sayfasındadır ve bu sözleşmenin parçasıdır.',
        'Makinasal açık artırmada da yalnızca aracı hizmet sağlayıcıdır; satış sözleşmesinin tarafı değildir, ödemeyi tahsil etmez ve teslimi üstlenmez. Açık artırma sonucu, alıcı ile satıcı arasında satış görüşmesinin başlatılmasını sağlar.',
      ]],
      ['9. Şikayet, moderasyon ve içerik kaldırma', [
        'Hukuka veya bu koşullara aykırı olduğunu düşündüğün içerik için ilan veya profil sayfasındaki “Şikayet et” seçeneğini kullanabilir ya da {{eposta}} adresine yazabilirsin. Bildirimler makul süre içinde incelenir.',
        'Makinasal; hukuka aykırı içeriği haberdar olduğunda veya yetkili makam talebi halinde kaldırma, ilan veya hesabı askıya alma, ilan geçmişini saklama haklarını saklı tutar. Karar hakkında itiraz için aynı iletişim kanalını kullanabilirsin.',
      ]],
      ['10. Ücretler ve premium üyelik', [
        'Platform’u gezmek, ücretsiz üyelik kapsamında ilan vermek, mesajlaşmak ve iş ağını kullanmak ücretsizdir. Ücretsiz üyeliğin sınırları (ilan sayısı, fotoğraf sayısı, kayıtlı arama sayısı vb.) Platform’da gösterilir.',
        'Pro ve Firma Pro ücretli üyeliklerdir. Fiyat, vergiler, süre, yenileme, iptal ve cayma koşulları satın alma öncesinde “Premium Üyelik Ön Bilgilendirme Formu” ile gösterilir; satın alma “Premium Üyelik Mesafeli Hizmet Sözleşmesi” ile kurulur.',
        'Premium üyelik; daha fazla ilan hakkı, aramalarda öne çıkma, telefondan video yükleme, açık artırmada teklif verme, Pro rozeti, daha fazla kayıtlı arama ve karşılaştırma hakkı, ilan onayında ve destek taleplerinde öncelik gibi avantajlar sağlar. Bu avantajlar ücretsiz üyelerin haklarını azaltmaz.',
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
        'İşlem ve içerik: ilanlar, fotoğraflar, ilan videoları ve video bağlantıları, teknik bilgiler ve bakım beyanları, makine karnesi kayıtları, fiyat ve ürün bilgileri, favoriler, kayıtlı aramalar, karşılaştırma seçimleri, teklif ve talepler, açık artırma teklifleri ve teklif geri çekme kayıtları, mesajlar, değerlendirmeler, şikayetler, davet kodu ve davet kayıtları, bildirimler.',
        'İlan istatistikleri: ilanlarının görüntülenme, favoriye eklenme, mesaj ve telefon görüntüleme sayıları (yalnızca toplam sayı olarak, sana gösterilmek üzere).',
        'Üyelik ve ödeme: üyelik türü (ücretsiz, Pro, Firma Pro), başlangıç ve bitiş tarihi; ödeme hizmeti etkinleştirildiğinde ödeme kuruluşundan gelen işlem özeti. Kart bilgileri Makinasal’da saklanmaz.',
        'Yapay zeka asistanı: premium üyelerin asistana yazdığı sorular ve asistanın yanıtları, hizmetin sunulması ve kullanım kotasının hesaplanması için işlenir.',
        'Bildirim: anlık bildirim açıldığında cihazına ait bildirim belirteci (token) ve cihaz türü.',
        'İşlem güvenliği ve teknik: oturum bilgileri, IP adresi, cihaz ve uygulama sürümü, hata ve güvenlik kayıtları (log), şüpheli işlem ve kötüye kullanım kayıtları. Açık artırma kurallarını ihlal eden hesaplar için, aynı kişinin yeni hesapla katılmasını önlemek amacıyla IP adresinin tek yönlü ve tuzlanmış özeti (adresin kendisi değil) 30 gün süreyle saklanır.',
      ]],
      ['3. İşleme amaçları', [
        'Üyelik oluşturma, kimlik ve hesap doğrulama; ilan yayımlama, arama, favori, kayıtlı arama bildirimleri, mesajlaşma ve teklif hizmetlerinin sunulması; açık artırmaların yürütülmesi ve kurallarına uyulmasının sağlanması; premium üyeliğin sunulması ve faturalanması; yapay zeka asistanının sunulması; iş ağı ve çekici bulma özelliklerinin yürütülmesi; ilan sahiplerine ilan istatistiklerinin gösterilmesi; müşteri destek taleplerinin yanıtlanması; şikayet ve moderasyon süreçlerinin yürütülmesi; dolandırıcılık, kötüye kullanım ve güvenlik risklerinin önlenmesi; mevzuattan doğan yükümlülüklerin yerine getirilmesi; hizmetin geliştirilmesi (yalnızca izin verdiğin ölçüm çerezleri ile).',
      ]],
      ['4. Hukuki sebepler', [
        'Verilerin işlenmesi; sözleşmenin kurulması veya ifası (KVKK m.5/2-c), hukuki yükümlülüğün yerine getirilmesi (m.5/2-ç), bir hakkın tesisi, kullanılması veya korunması (m.5/2-e) ve temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (m.5/2-f; örn. bilgi güvenliği ve dolandırıcılık önleme) sebeplerine dayanır.',
        'Cihaz konumu, ticari elektronik ileti ve isteğe bağlı ölçüm çerezleri gibi işlemler yalnızca açık rızana dayanır; rızanı istediğin zaman geri alabilirsin. Geri alma, öncesindeki işlemlerin hukuka uygunluğunu etkilemez.',
      ]],
      ['5. Toplama yöntemi', [
        'Veriler; üyelik ve profil formları, ilan ve mesaj ekranları, mobil uygulama ve web sitesi kullanımı, destek ve şikayet kanalları aracılığıyla elektronik ortamda, otomatik veya kısmen otomatik yöntemlerle toplanır.',
      ]],
      ['6. Verilerin aktarımı', [
        'Yurt içi ve yurt dışı hizmet sağlayıcılar: barındırma ve veritabanı (Supabase; veritabanı Avrupa Birliği/Frankfurt bölgesindedir), web barındırma (Vercel), e-posta gönderimi (Resend), bot koruması (Cloudflare Turnstile), Google ve Apple ile giriş (yalnızca bu yöntemi seçersen), anlık bildirim altyapısı (Expo ve cihaz üreticisinin bildirim hizmeti; bildirim açıldığında), yapay zeka asistanı (Anthropic; asistanı kullanırsan sorduğun soru ve gerekli ilan/profil bilgisi), hata izleme ve — ödeme açıldığında — ödeme kuruluşu (iyzico). Bu sağlayıcılar yalnızca Makinasal adına ve talimatlarımız kapsamında veri işler.',
        'Diğer kullanıcılar: ilan ve profil bilgilerin, ilan videoların, makine karnesi kayıtların ve üyelik türün (Pro rozeti) yayımlamayı seçtiğin kapsamda diğer ziyaretçilere görünür; mesajların yalnızca görüşmenin taraflarına gösterilir; telefon numaran giriş yapmış kullanıcılara yalnızca paylaşmayı seçtiğin ölçüde gösterilir. Açık artırmada teklif geçmişi diğer katılımcılara adın gösterilmeden (anonim) gösterilir; açık artırma sonunda kazananın bilgileri satıcıyla, satıcının bilgileri kazananla paylaşılır.',
        'Resmî mercilere: mahkeme, savcılık, kolluk ve düzenleyici kurumlar tarafından mevzuata uygun talep edilmesi halinde.',
        'Yurt dışına aktarım yapılması halinde KVKK m.9 kapsamında öngörülen güvencelerden (yeterlilik kararı, standart sözleşme, bağlayıcı şirket kuralları veya Kanun’da sayılan diğer yöntemler) biri uygulanır.',
      ]],
      ['7. Saklama süresi', [
        'Verileri, işleme amacının gerektirdiği süre ve ilgili mevzuatta öngörülen saklama süreleri boyunca saklarız (örneğin erişim kayıtları için 5651 sayılı Kanun’daki süreler). Hesabını kapattığında hesap verilerin, yasal saklama yükümlülüğü ve olası uyuşmazlıklar için gerekli olanlar dışında silinir veya anonim hale getirilir. Süre sonunda veriler silinir, yok edilir veya anonimleştirilir.',
        'Satılan veya kaldırılan ilanlara ait yüklenmiş videolar 30 gün sonra otomatik olarak silinir. Açık artırma men kaydındaki IP özeti 30 gün sonra geçerliliğini yitirir; ödeme yapmama nedeniyle verilen hesap menleri, kötüye kullanımın önlenmesi amacıyla hesap kaydıyla birlikte saklanır.',
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
        'Mobil uygulamada cihazda saklananlar: dil, görünüm (açık/koyu) ve renk teması tercihi; ilan listesi görünümü (liste/ızgara); yarım kalan ilan taslağı; ekspertiz kontrol listesindeki işaretler; nakliye tahmininde seçtiğin il ve girdiğin km fiyatı. Bunlar sunucuya gönderilmez ve uygulamayı silince ya da çıkış yapınca temizlenir.',
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
        'Makinasal, ilanlar ve açık artırmalar üzerinden yapılan alım-satım, kiralama ve hizmet işlemlerinde ödeme tahsil etmez, emanet para tutmaz ve ödeme aracılığı yapmaz. Bu anlaşmalar doğrudan kullanıcılar arasında kurulur.',
        'Makinasal’ın kendi sattığı tek hizmet premium üyeliktir (Pro, Firma Pro). Premium üyelik ödemesi açıldığında ödeme lisanslı ödeme kuruluşu (iyzico) aracılığıyla alınır. Premium üyeliğin fiyatı, süresi, yenilenmesi, iptali ve cayma koşulları “Premium Üyelik Ön Bilgilendirme Formu” ve “Premium Üyelik Mesafeli Hizmet Sözleşmesi”nde yer alır.',
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
        'Premium üyelik satın alınmadan önce; hizmet sağlayıcının kimliği, toplam fiyat ve vergiler, ilk ay tanışma fiyatı ve sonraki aylarda uygulanacak fiyat, ödeme ve ifa şartları, yenileme, iptal ve cayma koşulları ön bilgilendirme formu ile gösterilir ve onayına sunulur.',
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
      ['1/A. Video, teknik bilgi ve bakım kayıtları', [
        'İlan videosu ilan konusu makineye ait olmalı ve en fazla 60 saniye / 50 MB olmalıdır. Videoda kişisel veri, başka bir firmanın reklamı, telefon numarası veya müstehcen içerik bulunamaz. Video bağlantısı yalnızca YouTube veya Vimeo adresi olabilir.',
        'Teknik bilgiler (tonaj, çalışma saati, kırıcı hattı vb.), “Bakım ve durum” beyanı ve makine karnesindeki bakım kayıtları gerçeği yansıtmalıdır. Bu bilgiler alıcıya “Satıcı beyanı” olarak gösterilir; yanıltıcı beyan ilanın kaldırılmasına yol açabilir.',
        'Makine karnesine telefon numarası veya iletişim bilgisi yazılamaz; kayıtlar yalnızca bakım tarihini, göstergeyi ve yapılan işi içermelidir.',
      ]],
      ['1/B. Açık artırmadaki ilanlar', [
        'Açık artırmaya en az bir teklif gelmiş bir ilanın fiyatı, açıklaması ve fotoğrafları açık artırma bitene kadar değiştirilemez ve ilan yayından kaldırılamaz. Açık artırma kuralları “Açık Artırma Kuralları” sayfasındadır.',
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
  'acik-artirma': {
    title: 'Açık Artırma Kuralları',
    intro: 'Bu kurallar, Makinasal’daki açık artırmalara katılan satıcı ve teklif verenler için geçerlidir ve Kullanım Koşulları’nın parçasıdır.',
    sections: [
      ['1. Açık artırma başlatma', [
        'Yayında olan ilanının sahibi, ilanını 1, 3, 5, 7 veya 10 gün süreyle açık artırmaya çıkarabilir. Satıcı başlangıç fiyatını ve en az teklif artışını belirler.',
        'Henüz teklif gelmemiş bir açık artırmayı satıcı iptal edebilir. En az bir teklif geldikten sonra açık artırma iptal edilemez; ilanın fiyatı, açıklaması ve fotoğrafları açık artırma bitene kadar değiştirilemez ve ilan yayından kaldırılamaz.',
      ]],
      ['2. Teklif verme', [
        'Teklif vermek yalnızca üyeliği süresi dolmamış Pro ve Firma Pro üyelere açıktır. Satıcı kendi açık artırmasına teklif veremez.',
        'Her teklif, geçerli en yüksek tekliften en az belirlenen artış kadar yüksek olmalıdır. Kötüye kullanımı önlemek için bir kullanıcı dakikada en fazla 10 teklif verebilir.',
        'Bitimine 5 dakikadan az kala verilen her teklif, açık artırmanın bitiş süresini 5 dakika uzatır.',
        'Teklif geçmişi diğer katılımcılara teklif verenlerin adı gösterilmeden (anonim) gösterilir.',
        'Teklif vermek, açık artırmayı kazanman halinde ilan konusu makineyi teklif ettiğin bedelle satın alma niyetini bildirir. Kazanan ile satıcı, satışın koşullarını (teslim, ödeme, belgeler, noter işlemleri) kendi aralarında belirler.',
      ]],
      ['3. Teklifi geri çekme veya düşürme', [
        'Açık artırmanın bitimine 1 saatten fazla süre varken teklifini geri çekebilir veya düşürebilirsin. Bu hak bir açık artırmada en fazla 2 kez kullanılabilir. Bitime 1 saat veya daha az kaldığında teklif geri çekilemez ve düşürülemez.',
        'Teklif geri çekildiğinde veya düşürüldüğünde diğer katılımcılara ve satıcıya, kalan süreyle birlikte bildirim gönderilir.',
      ]],
      ['4. Açık artırmanın bitmesi', [
        'Süre dolduğunda en yüksek teklifi veren kazanır. Kazanana ve satıcıya bildirim gönderilir ve ikisi arasında mesajlaşma kendiliğinden açılır.',
        'Makinasal satışın tarafı değildir; ödemeyi tahsil etmez, emanet tutmaz ve teslimi üstlenmez. Ödemeden önce makineyi yerinde görmeni ve belgelerini doğrulamanı öneririz.',
      ]],
      ['5. Ödeme yapmayan kazanan', [
        'Kazanan, makul bir süre içinde satışı tamamlamazsa satıcı, açık artırmanın bitiminden itibaren 7 gün içinde bunu Makinasal’a bildirebilir. Bildirim Makinasal tarafından incelenir. Kazanan da satıştan vazgeçtiğini kendisi bildirebilir.',
        'Bildirimin Makinasal tarafından onaylanması veya kazananın vazgeçmesi halinde: kazananın premium üyeliği kalan süre için ücret iadesi yapılmaksızın sona erdirilir; hesabı açık artırmalara katılmaktan kalıcı olarak men edilir; aynı kişinin başka bir hesapla katılmasını önlemek için IP adresinin tek yönlü özeti 30 gün süreyle men listesine alınır.',
        'Bu durumda açık artırmada bir sonraki en yüksek teklifi veren katılımcıya, kendi teklif bedeliyle satın alması için 48 saat süreli bir teklif sunulur. Teklifi kabul etmek zorunlu değildir.',
        'Men kararına itiraz için {{eposta}} adresine yazabilirsin; itirazlar incelenir.',
      ]],
      ['6. Yasaklı davranışlar', [
        'Kendi ilanına başka hesaplarla teklif vererek fiyatı yapay olarak yükseltmek, katılımcılarla anlaşarak fiyatı düşük tutmak, sahte hesap açmak ve açık artırmayı platform dışına yönlendirmek yasaktır. Bu davranışlar açık artırmanın iptaline ve hesabın kapatılmasına yol açabilir.',
      ]],
    ],
  },

  'premium-on-bilgi': {
    title: 'Premium Üyelik Ön Bilgilendirme Formu',
    intro: '6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, premium üyelik satın alınmadan önce bilgine sunulur. Satın alma ekranında seçtiğin tarife, süre ve tutar bu formun parçasıdır.',
    sections: [
      ['1. Hizmet sağlayıcı', [
        'Unvan: {{unvan}}. Adres: {{adres}}. E-posta: {{eposta}}. Vergi dairesi ve numarası, MERSİS numarası ve telefon: [AVUKAT/ŞİRKET BİLGİSİ İLE DOLDURULACAK].',
      ]],
      ['2. Hizmetin temel nitelikleri', [
        'Pro: bireysel satıcılar, operatörler ve ustalar için; 30 ilan hakkı, ilan başına 20 fotoğraf, ilanların ve iş ağı ilanlarının üst sıralarda gösterilmesi, açık artırmalarda teklif verme, telefondan ilan videosu yükleme, yapay zeka iş asistanı (ayda 40 soru), Pro rozeti, 50 kayıtlı arama, 5 ilanı karşılaştırma, ilan onayında ve destek taleplerinde öncelik, reklamsız kullanım.',
        'Firma Pro: şirketler, filolar ve bayiler için; Pro’daki her şeye ek olarak 100 ilan hakkı, yapay zeka iş asistanı (ayda 200 soru), firma profilinin ve iş, kiralama ve eleman ilanlarının en üstte, satış ilanlarının aramalarda en üstte gösterilmesi.',
        'Öne çıkarma ve sıralama avantajları, arama kriterlerine uyan ilanlar arasında uygulanır; belirli bir görüntülenme, mesaj veya satış sonucu garanti edilmez.',
      ]],
      ['3. Fiyat ve vergiler', [
        'Aylık Pro: ilk ay 69,99 TL, sonraki her ay 89,99 TL. Aylık Firma Pro: ilk ay 179,99 TL, sonraki her ay 229,99 TL. İlk ay fiyatı, hesap başına yalnızca ilk aylık premium üyelikte bir kez uygulanır.',
        'Yıllık Pro: 899,90 TL. Yıllık Firma Pro: 2.299,90 TL. Yıllık üyelik 12 ay kullanım sağlar ve normal aylık fiyatın 10 katıdır.',
        'Fiyatlara KDV dahildir [AVUKAT/MALİ MÜŞAVİR TEYİT EDECEK]. Ödeme dışında ek bir masraf alınmaz.',
      ]],
      ['4. Ödeme ve yenileme', [
        'Ödeme, lisanslı ödeme kuruluşu iyzico aracılığıyla banka veya kredi kartı ile alınır. Kart bilgileri Makinasal’da saklanmaz.',
        'Aylık üyelik, sen iptal edene kadar her ay aynı gün kendiliğinden yenilenir ve yenilemede o aya ait normal fiyat tahsil edilir. Yıllık üyelik, sen iptal edene kadar her yıl yenilenir. Yenilemeden önce sana bildirim gönderilir.',
        'Fiyatlar değiştirilecekse, değişiklik yürürlüğe girmeden en az 30 gün önce bildirilir. Yeni fiyat, bildirimden sonraki ilk yenilemede uygulanır; kabul etmezsen yenileme öncesinde iptal edebilirsin.',
      ]],
      ['5. Hizmetin başlaması ve süresi', [
        'Premium üyelik, ödemenin onaylanmasıyla hemen başlar ve satın aldığın süre (bir ay veya bir yıl) boyunca geçerlidir. Bitiş tarihi Hesabım → Üyelik sayfasında gösterilir.',
      ]],
      ['6. İptal', [
        'Yenilemeyi istediğin zaman Hesabım → Üyelik sayfasından iptal edebilirsin. İptal, bir sonraki yenilemeyi durdurur; içinde bulunduğun dönemin sonuna kadar premium avantajlarını kullanmaya devam edersin.',
      ]],
      ['7. Cayma hakkı', [
        'Premium üyelik, elektronik ortamda anında ifa edilen bir hizmettir. Mesafeli Sözleşmeler Yönetmeliği’nin cayma hakkı istisnalarına ilişkin hükmü uyarınca, satın alma sırasında hizmetin hemen başlamasını onayladığında cayma hakkın bulunmaz [AVUKAT: istisnanın kapsamı, onay metni ve ilk yenilemelerdeki durum teyit edilecek].',
        'Hizmetin hiç başlatılamaması veya ciddi bir teknik aksaklık nedeniyle kullanılamaması halinde, kullanılamayan süreye ait bedel iade edilir.',
      ]],
      ['8. Üyeliğin sona erdirilmesi', [
        'Kullanım Koşulları’nın veya Açık Artırma Kuralları’nın ağır ihlali halinde premium üyelik sona erdirilebilir. Özellikle açık artırmayı kazanıp satışı tamamlamayan kullanıcının premium üyeliği, Açık Artırma Kuralları uyarınca kalan süre için ücret iadesi yapılmaksızın sona erdirilir [AVUKAT: tüketici mevzuatı karşısında geçerliliği teyit edilecek].',
      ]],
      ['9. Şikayet ve uyuşmazlık', [
        'Şikayet ve talepler için {{eposta}} adresine yazabilirsin. Uyuşmazlıklarda, her yıl belirlenen parasal sınırlar dahilinde tüketicinin yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetine, sınırları aşan uyuşmazlıklarda Tüketici Mahkemesine başvurabilirsin.',
      ]],
    ],
  },

  'premium-sozlesme': {
    title: 'Premium Üyelik Mesafeli Hizmet Sözleşmesi',
    intro: 'Bu sözleşme, premium üyelik satın alındığında elektronik ortamda kurulur. Premium Üyelik Ön Bilgilendirme Formu ve Kullanım Koşulları bu sözleşmenin ayrılmaz parçasıdır.',
    sections: [
      ['1. Taraflar', [
        'Hizmet sağlayıcı: {{unvan}}, {{adres}}, {{eposta}} (“Makinasal”). Alıcı: premium üyeliği satın alan, Makinasal hesabına kayıtlı kullanıcı (“Üye”). Üyenin adı, e-posta adresi ve fatura bilgileri satın alma sırasında alınır.',
      ]],
      ['2. Konu', [
        'Bu sözleşmenin konusu, Üyenin satın alma ekranında seçtiği premium tarifenin (Pro veya Firma Pro; aylık veya yıllık) Ön Bilgilendirme Formu’nda belirtilen kapsam, fiyat ve süre ile sunulmasıdır.',
      ]],
      ['3. Fiyat, ödeme ve yenileme', [
        'Fiyat, vergiler, ilk ay tanışma fiyatı, sonraki dönemlerde uygulanacak fiyat ve yenileme koşulları Ön Bilgilendirme Formu’nda ve satın alma ekranında gösterildiği gibidir. Ödeme iyzico aracılığıyla alınır.',
        'Üye, aylık veya yıllık üyeliğin iptal edilene kadar kendiliğinden yenileneceğini ve yenilemede o tarihteki normal fiyatın tahsil edileceğini kabul eder.',
      ]],
      ['4. Hizmetin ifası', [
        'Makinasal, ödemenin onaylanmasıyla premium avantajlarını Üyenin hesabında hemen etkinleştirir. Sıralama ve öne çıkarma avantajları belirli bir sonuç garantisi içermez.',
        'Makinasal, hizmetin kesintisiz sunulması için makul özeni gösterir; bakım, güvenlik veya mücbir sebeplerle kısa süreli kesintiler olabilir. Uzun süreli kesintilerde kullanılamayan süre için uzatma veya iade yapılır.',
      ]],
      ['5. Üyenin yükümlülükleri', [
        'Üye; premium avantajlarını Kullanım Koşulları, İlan Yayınlama Kuralları ve Açık Artırma Kuralları’na uygun kullanmayı, hesabını başkasına devretmemeyi ve fatura bilgilerini doğru vermeyi kabul eder.',
      ]],
      ['6. İptal ve sona erme', [
        'Üye yenilemeyi istediği zaman iptal edebilir; iptal bir sonraki yenilemeyi durdurur ve mevcut dönem sonuna kadar avantajlar devam eder.',
        'Makinasal, Kullanım Koşulları’nın veya Açık Artırma Kuralları’nın ağır ihlali halinde sözleşmeyi sona erdirebilir. Açık artırmayı kazanıp satışı tamamlamama halinde uygulanacak sonuçlar Açık Artırma Kuralları’nda düzenlenmiştir.',
      ]],
      ['7. Cayma hakkı', [
        'Cayma hakkına ilişkin bilgi Ön Bilgilendirme Formu’nun 7. maddesindedir.',
      ]],
      ['8. Kişisel veriler', [
        'Satın alma ve faturalama için gerekli kişisel veriler KVKK Aydınlatma Metni uyarınca işlenir.',
      ]],
      ['9. Uyuşmazlıklar', [
        'Bu sözleşmeye Türk hukuku uygulanır. Uyuşmazlıklarda, parasal sınırlar dahilinde Tüketici Hakem Heyetleri, sınırları aşan uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir.',
      ]],
      ['10. Yürürlük', [
        'Üye, satın alma ekranında bu sözleşmeyi ve Ön Bilgilendirme Formu’nu okuyup onayladığında sözleşme kurulmuş olur. Sözleşmenin bir kopyası Üyenin e-posta adresine gönderilir ve hesabında saklanır.',
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
