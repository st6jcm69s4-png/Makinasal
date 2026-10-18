# Yazarken arama önerileri

Ortak üst arama, ana sayfa araması ve İlanlarda ara ekranı aynı SearchAutocomplete bileşenini kullanır. Kaynaklar uygulamanın bölüm yolları, makine kategori/alt tür kataloğu, marka kataloğu ve parça gruplarıdır. Sonuçların var olduğu veya stok bulunduğu iddia edilmez; bunlar sonuç ekranını filtreleyen yönlendirmelerdir.

Önce görünen adı yazılan ifadeyle başlayan öneriler, ardından içinde geçenler gösterilir. Eşitlikte bölüm, kategori, parça grubu, marka sırası ve seçili dilin alfabetik sırası kullanılır. En fazla 10 öneri görünür. Türkçe/İngilizce etiketler desteklenir; I/İ/ı/i ve aksan farkları aramada toleranslıdır. Eşleşen her harf React metin parçalarıyla bordo mark içine alınır; HTML enjekte edilmez.

Öneriye tıklamak gerçek kategori, marka veya parça filtresini uygular. Seçili geçerli il korunur. Ana sayfada kiralık, iş ve parça sekmeleri kendi sonuç sayfalarına gider; İngilizce görünümde de veritabanı filtre değerleri Türkçe/kanonik kalır. İş makinesi kökü `group:machines` sanal grubuna, yalnızca 75 makine/araç türüne karşılık gelir; yedek parça bu gruba dahil edilmez.

Ok tuşları öneri seçer, Enter seçili öneriyi açar, Esc kapatır. Bir öneri seçilmeden Enter/Ara kullanımı normal metin aramasını sürdürür. Dışarı tıklama ve odaktan ayrılma açılır listeyi kapatır. Kapalı liste DOM'da bulunmadığı için önceki üst menü bağlantılarını örtmez. Öneriler yerel katalogdan hesaplanır; yazarken sunucuya/üçüncü tarafa ek istek gönderilmez.

Doğrulama: `scripts/check-search-suggestions.mjs`, mevcut mantık testleri, TypeScript ve üretim derlemeleri. Sunucu HTML render kontrolünde Türkçe eşleşen harfler, güvenli HTML kaçışı ve combobox semantiği kontrol edilir. Bu ortamda gerçek cihaz/tarayıcı etkileşim testi yapılamadı. Genel ilan sonuç ekranındaki daha önce belgelenen 300 kayıt sınırı bu değişiklikle kaldırılmadı.
