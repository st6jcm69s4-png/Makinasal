# Dil, ayarlar, mesaj denetimi ve üst menü — 18 Ekim 2026

## Dil ve ayarlar
`/ayarlar` menüden açılır. Türkçe / English seçimi çerezde ve tarayıcı depolamasında hatırlanır. HTML lang seçimi sunucuda çerezden yapılır; istemci dil değişikliğini sayfayı yenilemeden uygular. Yeni bir cihazın tercihi Türkçedir. İlan başlıkları, açıklamalar, kişi/şirket adları ve mesaj gövdeleri otomatik çevrilmez.

Uygulama kopyası, kategori/alt tür, parça grubu, şifre kuralları, durum etiketleri ve yaygın hata mesajları açık bir İngilizce sözlükten çevrilir. Form option değerleri ve veritabanı enumları Türkçe/kanonik değerlerini korur. Kayıt sırasında çeviri metni yazılmaz. Para birimi TRY ve ülke Türkiye olarak kalır. Tarih/sayı gösterimi ilgili ekranlarda dilin biçimini kullanır.

## Mesajlarda küfür engeli
Normal mesajlar ve teklif mesajları için Türkçe/İngilizce küfür ve belirli ağır hakaretlerden oluşan kural listesi kullanılır. NFKD, harf büyüklüğü, bazı rakam/harf ikameleri, görünmez karakterler ve kısa tokenlar arasında nokta/boşlukla ayırma denetlenir. Türkçedeki sık, sıkıştırma, sıkıntı gibi kelimeler ve İngilizce class, Scunthorpe, got gibi örnekler için yanlış engelleme testleri vardır.

Arayüz, taslağı koruyarak neden gönderilemediğini gösterir. Veritabanındaki BEFORE INSERT / UPDATE tetikleyicileri `messages` ve `market_quote_messages` tablolarını ayrıca denetler; istemci kuralını atlamak küfürlü bir kaydı kabul ettirmez. Denetim yardımcıları özel şemadadır; istemciye yürütme yetkisi verilmez. Önceki mesajlar topluca değiştirilmez.

Kural tabanlı bir liste her dildeki yeni argo veya tüm gizleme yöntemlerini kesin olarak anlayamaz; geri bildirimle güncellenmelidir. Her liste değişikliği JS/SQL eşliği ve zararsız ifade testleriyle doğrulanır.

## Ortak üst menü
Her uygulama sayfasının ortak başlığında sağda Ana sayfa, İlan ver ve Hesabım; ortada ilan araması vardır. Mobilde arama ikinci satırda tam genişliktedir. Arama GET /ilanlar?q=... kullanır ve JavaScript yönlendirmesine bağımlı değildir. Üst bağlantılar normal href taşır; Hesabım hedefi oturum yüklenirken değişmez. Menü kapalıyken perde/panel kesin olarak gizlenir. Açık menüde üst eylemler perdenin üzerinde tıklanabilir ve seçildiğinde menü kapanır. İsim altındaki Profil, diğer menü satırlarıyla aynı font/padding/dokunma alanına sahiptir; ikinci Profil satırı kaldırılmıştır.

## Kontroller
`npm test`: ortak mantık, PWA, veri akışları ve dil/denetim kontrolleri. Next ve Vinext TypeScript/üretim derlemeleri. İki dilde sunucu render kontrolleri: Ayarlar, şifre kuralları, kategori değerleri ve kullanıcı metni korunması; ortak üst başlık ve arama hedefleri. `supabase/tests/message_profanity.sql`: doğrudan istemci gönderimi, iki mesaj tablosu, güncelleme engeli, zararsız mesajlar. Veritabanı testleri rollback ile temizlenir.

Gerçek cihazda tıklama ve ekran görüntüsü kontrolü bu ortamda yapılamadı; “tüm cihazlarda hatasız” garantisi verilmez. Önceden belgelenen ödeme/SMS/OAuth dış kurulumları ve genel arama sınırları bu sürümle çözülmüş sayılmaz.
