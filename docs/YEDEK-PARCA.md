# Yedek parça ve iş/hizmet gezinmesi

Ana menüde Yedek parça → `/yedek-parca`. Makine veya araç ailesi/alt tür seçilir; ardından parça grubu ve isteğe bağlı marka, il, parça adı/numarası filtrelenir. Her adımda alttaki gerçek ve aktif ilanlar veritabanından tekrar sorgulanır. Sayfalama 24 ilanla yapılır. Seçimler URL'de korunur; üstteki yol bağlantıları alt filtreyi temizleyerek geri dönmeyi sağlar.

Yeni parça ilanları equipment_category ve part_group ile sınıflandırılır. Mevcut, sınıflandırılmamış ilanlar tüm parçalar görünümünde korunur; makine filtresi seçildiğinde uyumluluk tahmin edilerek yanlış sonuç gösterilmez. Marka/model, OEM numarası ve gerçek uyumluluk alıcı ile satıcı tarafından ayrıca teyit edilmelidir.

“Firmalar ve parçacılar” menü bağlantısı kaldırıldı; eski firma dizini şirketlere yönlenir. Şirket detay sayfaları ve sahiplik kayıtları korunur. “İş ağı”nın ana girişi `/is-ve-hizmetler` oldu: İşimi yaptır, İş bul ve Şirket bul. Altında yeni iş talepleri ve teklif takibi vardır. Eski `/is-agi` ana adresi yeni ekrana yönlenir; ilan/teklif detay URL'leri korunur.

Menü hesabındaki ok kaldırıldı; ismin hemen altında Profil bağlantısı var.
