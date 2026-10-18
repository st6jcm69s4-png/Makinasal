/**
 * Hukuki metin TASLAKLARI. Yayına almadan önce bir avukata onaylatın;
 * [KÖŞELİ] alanları şirket bilgilerinizle doldurun.
 */
export const LEGAL_SLUGS = ['kvkk', 'kullanim-sozlesmesi', 'cerez-politikasi', 'mesafeli-satis-ve-ticaret'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_UPDATED = '2026-10-18';

type Doc = { title: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<LegalSlug, Doc> = {
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    sections: [
      { h: 'Veri sorumlusu', p: ['6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu [ŞİRKET UNVANI], [ADRES], [KEP/E-POSTA] adresli Makinasal işletmecisidir.'] },
      { h: 'İşlenen veriler', p: ['Ad soyad, telefon, e-posta, il/ilçe, profil bilgileri; ilan içeriği ve fotoğrafları; mesajlaşma kayıtları; değerlendirme ve şikâyet kayıtları; IP adresi, cihaz ve kullanım bilgileri; ödeme kullanılırsa ödeme sağlayıcısından gelen işlem özeti (kart bilgisi Makinasal’da saklanmaz).'] },
      { h: 'İşleme amaçları ve hukuki sebepler', p: ['Üyelik ve ilan hizmetinin sunulması (sözleşmenin ifası), güvenlik ve dolandırıcılık önleme (meşru menfaat), yasal yükümlülüklerin yerine getirilmesi, pazarlama iletileri (yalnızca açık rızanızla).'] },
      { h: 'Aktarım', p: ['Veriler; barındırma ve veritabanı (Supabase), ödeme (iyzico), SMS/e-posta sağlayıcıları ile yetkili kurumlara, hizmetin gerektirdiği ölçüde ve yurt dışına aktarım hükümlerine uygun biçimde aktarılabilir. Telefon numaranız yalnızca ilan sahibi olarak ilanınızda göstermeyi seçtiğiniz ölçüde görünür.'] },
      { h: 'Saklama süresi', p: ['Veriler, hesap açık kaldığı sürece ve yasal zamanaşımı süreleri boyunca saklanır; sonrasında silinir veya anonim hale getirilir.'] },
      { h: 'Haklarınız', p: ['KVKK madde 11 uyarınca verilerinize erişme, düzeltme, silme, işlemeye itiraz etme ve zarar giderimini talep etme hakkınız vardır. Başvurularınızı [KEP/E-POSTA] adresine iletebilirsiniz.'] },
    ],
  },
  'kullanim-sozlesmesi': {
    title: 'Kullanım Sözleşmesi',
    sections: [
      { h: 'Hizmetin niteliği', p: ['Makinasal, kullanıcıların iş makinesi, kamyon, yedek parça ve lastik ilanı yayınlamasına ve birbirleriyle iletişim kurmasına aracılık eden bir ilan platformudur. Alım satım, kiralama veya hizmet sözleşmesinin tarafı değildir; ilan içeriğinden ilan sahibi sorumludur.'] },
      { h: 'Üyelik', p: ['Üye, doğru ve güncel bilgi vermeyi, hesap güvenliğini korumayı kabul eder. Hesaplar devredilemez. Ücretsiz üyelikte aynı anda en fazla 3 aktif ilan ve 8 fotoğraf sınırı uygulanır.'] },
      { h: 'Yasak içerik ve davranışlar', p: ['Yanıltıcı ilan, çalıntı veya hukuka aykırı mal, sahte belge, küfür ve hakaret, platform dışına yönlendirme amaçlı IBAN/bağlantı paylaşımı, spam ve otomatik veri toplama yasaktır. Makinasal bu içerikleri kaldırabilir, hesabı kısıtlayabilir veya kapatabilir.'] },
      { h: 'Güvenlik uyarısı', p: ['Makinasal emanet ödeme hizmeti vermez. Aracı veya makineyi görmeden kapora/ön ödeme göndermemenizi, belgeleri ve seri numarasını kontrol etmenizi öneririz.'] },
      { h: 'Ücretler', p: ['Premium üyelik, öne çıkarma ve mağaza paketleri ücretlidir; fiyatlar satın almadan önce gösterilir.'] },
      { h: 'Sorumluluk ve uyuşmazlık', p: ['Makinasal, kullanıcılar arasındaki işlemlerden doğan zararlardan kanunun izin verdiği ölçüde sorumlu tutulamaz. Uyuşmazlıklarda [ŞEHİR] mahkemeleri ve icra daireleri yetkilidir.'] },
    ],
  },
  'cerez-politikasi': {
    title: 'Çerez Politikası',
    sections: [
      { h: 'Zorunlu çerezler', p: ['Oturum açma, dil tercihi ve güvenlik için gereklidir; kapatılamaz.'] },
      { h: 'Ölçüm çerezleri', p: ['Makinasal şu an üçüncü taraf reklam çerezi kullanmaz. İleride analitik aracı eklenirse bu sayfa güncellenir ve açık onayınız istenir.'] },
      { h: 'Yönetim', p: ['Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz; bu durumda oturum açma çalışmayabilir.'] },
    ],
  },
  'mesafeli-satis-ve-ticaret': {
    title: 'Mesafeli Satış ve Elektronik Ticaret Bilgilendirmesi',
    sections: [
      { h: 'Hizmet sağlayıcı bilgisi (6563 sayılı Kanun)', p: ['Unvan: [ŞİRKET UNVANI] · Adres: [ADRES] · Vergi dairesi/no: [VD / NO] · MERSİS: [NO] · ETBİS kaydı: [NO] · İletişim: [E-POSTA / TELEFON].'] },
      { h: 'Ücretli hizmetler', p: ['Premium üyelik, ilan öne çıkarma ve mağaza paketleri dijital hizmettir. Ödeme öncesi hizmetin kapsamı, süresi ve KDV dahil bedeli gösterilir.'] },
      { h: 'Cayma hakkı', p: ['Tüketici, hizmet ifasına başlanmadan önce 14 gün içinde cayabilir. İfasına onayıyla başlanan dijital hizmetlerde, Mesafeli Sözleşmeler Yönetmeliği’nin ilgili istisnaları uygulanır. Talepler [E-POSTA] adresine iletilir.'] },
      { h: 'İlan işlemleri', p: ['İlanlarda yer alan makine, araç ve parçaların satışı kullanıcılar arasında yapılır; Makinasal satıcı değildir.'] },
      { h: 'Başvuru yolları', p: ['Tüketici şikâyetleri için ilgili İl/İlçe Tüketici Hakem Heyeti ve Tüketici Mahkemeleri’ne başvurulabilir.'] },
    ],
  },
};
