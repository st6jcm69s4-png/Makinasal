# Makinasal – Devir Notu (yeni Claude hesabına yapıştırın)

Proje: sahibinden.com benzeri, sadece iş makineleri, kamyon (mikser, pompa, tır çekicisi, kurtarıcı, forklift) ve parça/lastik/ekipman ilanları platformu. Sadece Türkiye.
Kullanıcı: kodlama bilmiyor, AI ile öğrenecek; günde 1-2 saat; aylık bütçe 5.000 TL. Önce satıcılar hedef.
Zorunlu özellikler: alıcı/satıcı puanı ve güven seviyesi (Riskli / Yeni üye / Orta güven / Güvenilir / Çok güvenilir), şeffaf ilan ücreti, depozito/emanet (Faz 2, lisanslı ödeme kuruluşuyla).
Güven seviyesi kuralı: rep>=2 veya (anlaşma>=3 ve puan<3) → Riskli; anlaşma<3 veya puansız → Yeni üye; puan>=4.5 ve anlaşma>=10 → Çok güvenilir; puan>=4 → Güvenilir; diğer → Orta güven.
Fiyat uyarısı: fiyat/medyan <0.6 düşük (dolandırıcılık uyarısı), >1.6 yüksek; parça/lastikte hesaplanmaz.
Mesaj filtresi: IBAN ve link engellenir; "kapora/ön ödeme/havale/eft" uyarı verir. Puan sadece iki taraf satışı onaylarsa verilir.
Plan: Next.js + Tailwind + Supabase + Cloudflare + GitHub. 
Durum: HTML prototip (makinasal-prototip.html) tamam; supabase/schema.sql yazıldı (denenmedi); Next.js projesi kurulmadı (önceki ortamda npm erişimi engelliydi).
Sıradaki adım: Supabase hesabı aç, schema.sql çalıştır, Next.js projesini kur, GitHub'a "makinasal" deposu aç.
Hatırlatma: TÜRKPATENT ve alan adı kontrolü; KVKK, 6563, ETBİS, ödeme için TCMB lisanslı kuruluş.
