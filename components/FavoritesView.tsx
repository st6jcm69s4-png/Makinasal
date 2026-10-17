'use client';

import { filtersToParams } from '@/lib/searchParams';
import { formatTL } from '@/lib/format';
import { filterLabel, filterListings } from '@/lib/market';
import { ListingCard } from './ListingCard';
import { useMarket } from './MarketProvider';
import { Pill } from './ui';

export function FavoritesView() {
  const { listings, sellers, favs, saved, newCount, setNotify, deleteSaved, markSeen, myCity, profile, authReady } = useMarket();
  const favListings = Object.keys(favs).map((k) => listings.find((l) => String(l.id) === k)).filter((l): l is NonNullable<typeof l> => !!l);

  async function run(id: string) {
    const s = saved.find((x) => x.id === id);
    if (!s) return;
    await markSeen(id);
    const p = filtersToParams(s.f);
    window.location.assign(`/ilanlar?${p.toString()}`);
  }

  return (
    <>
      <h1>Favoriler</h1>
      <p className="lead">Beğendiğin ilanları ve kayıtlı aramalarını burada takip et. Fiyatı düşen ya da aramana uyan yeni ilanlar işaretlenir.</p>
      {authReady && !profile ? <div className="note" style={{ marginTop: 14 }}>Giriş yapmadan favorilerin yalnızca bu cihazda saklanır. <a className="linkbtn" href="/giris">Giriş yap</a></div> : null}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="panel">
          <h3>Kayıtlı aramalar</h3>
          <p className="sub" style={{ margin: '4px 0 6px' }}>Yeni ilan çıkınca burada ve menüdeki rozette gösterilir. (SMS ve e-posta bildirimi sonraki aşamada.)</p>
          {saved.length === 0 ? <div className="empty">Kayıtlı aramın yok. İlanlar sayfasında filtreleri seç ve &quot;Aramayı kaydet&quot;e bas.</div> : saved.map((s) => {
            const n = newCount(s);
            const tot = filterListings(listings, sellers, s.f, myCity).length;
            return (
              <div key={s.id} className="mine">
                <div style={{ minWidth: 0 }}><b>{filterLabel(s.f)}</b><br /><span className="sub">{tot} ilan{n ? ' · ' : ''}{n ? <Pill cls="prem">{n} yeni ilan</Pill> : null}</span></div>
                <div className="acts-row">
                  <label className="check"><input type="checkbox" checked={s.notify} onChange={(e) => void setNotify(s.id, e.target.checked)} />Yeni ilan bildir</label>
                  <button className="btn sm" type="button" onClick={() => void run(s.id)}>Çalıştır</button>
                  <button className="btn ghost sm" type="button" onClick={() => void deleteSaved(s.id)}>Sil</button>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <h2 style={{ marginBottom: 12 }}>Favori ilanlar</h2>
          {favListings.length === 0 ? <div className="empty">Henüz favorin yok. Bir ilandaki kalp düğmesine bas.</div> : (
            <div className="grid">
              {favListings.map((l) => {
                const was = favs[String(l.id)];
                return (
                  <div key={String(l.id)}>
                    <ListingCard l={l} />
                    {was > 0 && l.price < was ? <div className="note good" style={{ marginTop: 6 }}>Favoriye eklediğinden beri <b>{formatTL(was - l.price)}</b> düştü.</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
