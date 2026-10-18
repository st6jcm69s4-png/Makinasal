import { Text } from "@/components/LanguageProvider";
export const metadata = { title: 'Yardım | Makinasal' };
export default function HelpPage() { return <><h1><Text value={"Yardım merkezi"} /></h1><div className="panel" style={{ marginTop: 20 }}>
<h2><Text value={"Hesabıma giremiyorum"} /></h2><p><a className="linkbtn" href="/giris"><Text value={"Giriş sayfasından"} /></a> <Text value={" “Şifremi unuttum” seçeneğini kullan. Onay e-postasını spam klasöründe de kontrol et."} /></p>
<h2><Text value={"Fotoğraflarım yüklenmedi"} /></h2><p><Text value={"İlan duraklatılmış olarak saklanır. "} /><a className="linkbtn" href="/ilanlarim"><Text value={"İlanlarım"} /></a> <Text value={" bölümünde Düzenle’ye bas, eksik fotoğrafları ekle ve kaydet."} /></p>
<h2><Text value={"Şüpheli ilan veya ödeme isteği"} /></h2><p><Text value={"İlan detayındaki “İlanı şikayet et” düğmesini kullan. Ürünü görmeden kapora gönderme. Makinasal şu anda ödeme veya emanet para kabul etmez."} /></p>
<h2><Text value={"İlan nasıl kaldırılır?"} /></h2><p><Text value={"İlanlarım bölümünden “İlanı kaldır” seçeneğini kullan. İşlem ve değerlendirme geçmişi korunur."} /></p>
<h2><Text value={"Ücret var mı?"} /></h2><p><Text value={"Başlangıç döneminde ilan vermek ücretsizdir. "} /><a className="linkbtn" href="/premium"><Text value={"Üyelik sınırlarını incele."} /></a></p>
</div></>; }
