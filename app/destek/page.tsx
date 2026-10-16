import Link from 'next/link';
export const metadata = { title: 'Yardım | Makinasal' };
export default function HelpPage() { return <><h1>Yardım merkezi</h1><div className="panel" style={{ marginTop: 20 }}>
<h2>Hesabıma giremiyorum</h2><p><Link className="linkbtn" href="/giris">Giriş sayfasından</Link> “Şifremi unuttum” seçeneğini kullan. Onay e-postasını spam klasöründe de kontrol et.</p>
<h2>Fotoğraflarım yüklenmedi</h2><p>İlan duraklatılmış olarak saklanır. <Link className="linkbtn" href="/ilanlarim">İlanlarım</Link> bölümünde Düzenle’ye bas, eksik fotoğrafları ekle ve kaydet.</p>
<h2>Şüpheli ilan veya ödeme isteği</h2><p>İlan detayındaki “İlanı şikayet et” düğmesini kullan. Ürünü görmeden kapora gönderme. Makinasal şu anda ödeme veya emanet para kabul etmez.</p>
<h2>İlan nasıl kaldırılır?</h2><p>İlanlarım bölümünden “İlanı kaldır” seçeneğini kullan. İşlem ve değerlendirme geçmişi korunur.</p>
<h2>Ücret var mı?</h2><p>Başlangıç döneminde ilan vermek ücretsizdir. <Link className="linkbtn" href="/premium">Üyelik sınırlarını incele.</Link></p>
</div></>; }
