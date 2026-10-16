'use client';

import { useState, type FormEvent } from 'react';
import { CATEGORIES } from '@/lib/data/constants';
import { formatScore } from '@/lib/format';
import { dropPct, recency } from '@/lib/listing';
import { isFeatured } from '@/lib/market';
import { trustLevel } from '@/lib/trust';
import { ListingCard } from './ListingCard';
import { useMarket } from './MarketProvider';
import { Avatar, Pill, toneClass } from './ui';

export function HomeView() {
  const { listings, sellers } = useMarket();
  const [q, setQ] = useState('');

  const go = (e: FormEvent) => { e.preventDefault(); window.location.assign(q.trim() ? `/ilanlar?q=${encodeURIComponent(q.trim())}` : '/ilanlar'); };
  const feat = listings.filter((l) => isFeatured(l, sellers[l.sel])).sort((a, b) => recency(b) - recency(a)).slice(0, 4);
  const drops = listings.filter((l) => dropPct(l) > 0).sort((a, b) => dropPct(b) - dropPct(a)).slice(0, 4);
  const fresh = [...listings].sort((a, b) => recency(b) - recency(a)).slice(0, 4);
  const stores = Object.entries(sellers)
    .filter(([k, m]) => k !== 'ME' && m.type === 'Kurumsal' && m.ver && (m.s ?? 0) >= 4.5).slice(0, 6);

  return (
    <>
      <h1>Makineni bul, <mark>işini büyüt.</mark></h1>
      <p className="lead">Satılık ve kiralık makineler, operatörler, iş fırsatları ve yedek parçalar. İşini paylaş, teklif al; bölgendeki hafriyat firmasını ve parçacını bul.</p>
      <form className="searchbar" role="search" onSubmit={go}>
        <label className="sr" htmlFor="hq">Marka veya model ara</label>
        <input type="text" id="hq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marka veya model ara. Örn. Hidromek, Scania, 315/80R22.5" />
        <button className="btn" type="submit">Ara</button>
      </form>
      <div className="network-home-links"><a href="/kiralik">Kiralık makine</a><a href="/operatorler">Operatör bul</a><a href="/isler">İş bul / İş ver</a><a href="/parca-talepleri">Parça iste / Fiyat ver</a><a href="/firmalar">Hafriyat firmaları ve parçacılar</a></div>
      <h2>Satılık makineler ve parçalar</h2>
      <div className="tiles">
        {CATEGORIES.map((c) => (
          <a key={c} href={`/ilanlar?cat=${encodeURIComponent(c)}`} className="tile">
            <span className="tn">{c}</span>
            <span className="tc">{listings.filter((l) => l.cat === c).length} ilan</span>
          </a>
        ))}
      </div>
      <Section title="Öne çıkan ilanlar" list={feat} all="rec" />
      <Section title="Bu hafta fiyatı düşenler" list={drops} all="drop" />
      <Section title="Yeni eklenenler" list={fresh} all="new" />
      {stores.length > 0 ? (
        <div className="sect">
          <div className="sect-h"><h2>Güvenilir mağazalar</h2></div>
          <div className="stores">
            {stores.map(([k, m]) => {
              const lv = trustLevel(m);
              return (
                <a key={k} href={`/magaza/${k}`} className="store">
                  <Avatar name={m.name} small />
                  <span><b>{m.name}</b><br /><span className="sub">{m.city} · {listings.filter((l) => l.sel === k).length} ilan · puan {formatScore(m.s)}</span><br /><Pill cls={toneClass(lv.tone)}>{lv.label}</Pill></span>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="sect">
        <div className="sect-h"><h2>Neden Makinasal</h2></div>
        <div className="three">
          <div className="panel"><h3>Satıcıyı tanı</h3><p className="sub" style={{ margin: '6px 0 0' }}>Alıcı ve satıcı puanı yalnızca gerçekleşen işlemlerden sonra verilir.</p></div>
          <div className="panel"><h3>Kapora tuzağına karşı</h3><p className="sub" style={{ margin: '6px 0 0' }}>Çok düşük fiyat uyarısı, IBAN ve link engeli, &quot;görmeden kapora verme&quot; hatırlatması.</p></div>
          <div className="panel"><h3>Şeffaf ücret</h3><p className="sub" style={{ margin: '6px 0 0' }}>Kurucu döneminde ilan ücretsiz. Fiyata göre ek ücret yok.</p></div>
        </div>
      </div>
    </>
  );
}

function Section({ title, list, all }: { title: string; list: ReturnType<typeof useMarket>['listings']; all: string }) {
  if (list.length === 0) return null;
  return (
    <div className="sect">
      <div className="sect-h"><h2>{title}</h2><a className="linkbtn" href={`/ilanlar?sort=${all}`}>Tümünü gör</a></div>
      <div className="grid">{list.map((l) => <ListingCard key={String(l.id)} l={l} />)}</div>
    </div>
  );
}
