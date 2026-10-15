import { SELLERS } from '@/lib/data/sellers';
import { Pill, toneClass } from '@/components/ui';
import { formatScore } from '@/lib/format';
import { trustLevel } from '@/lib/trust';

export const metadata = { title: 'Güven sistemi | Makinasal' };

const KEYS = ['A', 'D', 'B', 'E', 'C', 'H'];

export default function TrustPage() {
  return (
    <>
      <h1>Güven sistemi</h1>
      <p className="lead">Her üyenin alıcı ve satıcı olarak ayrı puanı olur. Puan yalnızca iki tarafın da işlemi onayladığı görüşmelerden sonra verilebilir.</p>
      <div className="two" style={{ marginTop: 18 }}>
        <div className="panel">
          <h3>Seviyeler</h3>
          <p className="sub" style={{ margin: '6px 0 12px' }}>Eşikler başlangıç için belirlendi, kullanımla ayarlanacak.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><Pill cls="good">Çok güvenilir</Pill> <span className="out"> 4,5 üzeri puan ve en az 10 onaylı işlem</span></div>
            <div><Pill cls="good">Güvenilir</Pill> <span className="out"> 4,0 üzeri puan</span></div>
            <div><Pill cls="warn">Orta güven</Pill> <span className="out"> 4,0 altı puan</span></div>
            <div><Pill>Yeni üye</Pill> <span className="out"> 3 işlemden az, puan henüz oluşmadı</span></div>
            <div><Pill cls="bad">Riskli</Pill> <span className="out"> 2 veya daha fazla doğrulanmış şikayet, ya da düşük puan</span></div>
          </div>
        </div>
        <div className="panel">
          <h3>Puan nasıl verilir</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {['Alıcı ve satıcı Mesajlar bölümünde yazışır.', 'Alım satım gerçekleşirse iki taraf da "işlem gerçekleşti" onayı verir.', 'İki onay tamamlanınca iki taraf birbirini yıldız, etiket ve kısa yorumla puanlar.', 'Puan, satıcı veya alıcı ortalamasına işlenir. Onaysız görüşmede puan verilemez.'].map((t, i) => (
              <div key={i} className="step"><span className="badge-n">{i + 1}</span><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Puanı ne etkiler</h3>
        <ul className="clean" style={{ marginTop: 10 }}>
          <li>Alıcı ve satıcıdan aldığı yıldızlar (ayrı ayrı hesaplanır)</li>
          <li>Onaylanmış işlem sayısı</li>
          <li>Moderatörün doğruladığı şikayetler (doğrulanmamış şikayet seviyeyi düşürmez)</li>
          <li>Telefon, kimlik ve vergi levhası doğrulaması (rozet olarak görünür)</li>
          <li>İlanın gerçekten satıldığı bilgisi</li>
        </ul>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Örnek üyeler (demo)</h3>
        <div className="scroll" style={{ marginTop: 8 }}>
          <table>
            <thead><tr><th>Üye</th><th>Tür</th><th>Satıcı puanı</th><th>Alıcı puanı</th><th>İşlem</th><th>Seviye</th></tr></thead>
            <tbody>
              {KEYS.map((k) => { const m = SELLERS[k]; const lv = trustLevel(m); return (
                <tr key={k}><td>{m.name}</td><td>{m.type}</td><td>{formatScore(m.s)}</td><td>{formatScore(m.b)}</td><td>{m.deals}</td><td><Pill cls={toneClass(lv.tone)}>{lv.label}</Pill></td></tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="note" style={{ marginTop: 16 }}>Kötüye kullanım önlemi: puan verilen kişi itiraz edebilir, itirazlar moderasyon ekibince incelenir. Yorum ve puan kuralları KVKK ve hakaret konularında hukukçuyla yazılmalıdır.</div>
    </>
  );
}
