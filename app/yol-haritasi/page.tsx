export const metadata = { title: 'Yol haritası | Makinasal' };

const MVP: [string, string?][] = [
  ['İlan, fotoğraf, arama ve filtreler', 'İş makineleri, beton, kamyon, tır çekicisi, kurtarıcı, forklift, yedek parça, lastik. 81 il.'],
  ['Profil, doğrulama ve mağaza sayfası', 'Telefon, kimlik, vergi levhası.'],
  ['Mesajlaşma', 'IBAN ve harici link engeli, kapora uyarısı.'],
  ['Alıcı ve satıcı puanı', 'İki taraf da işlemi onaylayınca.'],
  ['Fiyat göstergesi, takas ve teklif'],
  ['Favoriler, kayıtlı arama, karşılaştırma, inceleme listesi'],
  ['Şikayet takibi ve şeffaf ilan ücreti'],
];
const PHASE2: [string, string?][] = [
  ['Emanet depozito', 'Lisanslı ödeme kuruluşunun bloke hesabıyla.'],
  ['Gerçek harita ve yol mesafesi'],
  ['Nakliye ve sigorta teklifi alma'],
  ['Sahibinden’den toplu ilan taşıma'],
  ['Kiralama, ekspertiz ortaklığı, mobil uygulama'],
];

export default function PlanPage() {
  return (
    <>
      <h1>Yol haritası</h1>
      <p className="lead">Ürün kararları. Bütçe: aylık 5.000 ₺, günde 1 ila 2 saat çalışma.</p>
      <div className="two" style={{ marginTop: 18 }}>
        <div className="panel"><h3>MVP (ilk sürüm)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {MVP.map(([t, s], i) => <div key={t} className="step"><span className="badge-n">{i + 1}</span><div><b>{t}</b>{s ? <><br /><span className="sub">{s}</span></> : null}</div></div>)}
          </div>
        </div>
        <div className="panel"><h3>Faz 2</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {PHASE2.map(([t, s], i) => <div key={t} className="step"><span className="badge-n">{'ABCDE'[i]}</span><div><b>{t}</b>{s ? <><br /><span className="sub">{s}</span></> : null}</div></div>)}
          </div>
          <div className="note" style={{ marginTop: 16 }}>Emanet için parayı kendi hesabında tutma. Lisanslı bir ödeme firmasıyla çalışmak gerekir.</div>
        </div>
      </div>
    </>
  );
}
