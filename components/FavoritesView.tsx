'use client';
import { useLanguage } from "@/components/LanguageProvider";


import { filtersToParams } from '@/lib/searchParams';
import { formatTL } from '@/lib/format';
import { filterLabel, filterListings } from '@/lib/market';
import { ListingCard } from './ListingCard';
import { useMarket } from './MarketProvider';
import { Pill } from './ui';

export function FavoritesView() {
  const { t: tr, language } = useLanguage();

  const { listings, sellers, favs, saved, newCount, setNotify, deleteSaved, markSeen, myCity, profile, authReady, favoriteListings: favListings, favoritesReady, favoritesError, retryFavorites, removeFav } = useMarket();
  const unavailable = favoritesReady && !favoritesError ? Object.keys(favs).filter(key => !favListings.some(l => String(l.id) === key)) : [];

  async function run(id: string) {
    const s = saved.find((x) => x.id === id);
    if (!s) return;
    await markSeen(id);
    const p = filtersToParams(s.f);
    window.location.assign(`/ilanlar?${p.toString()}`);
  }

  return (
    <>
      <h1>{tr("Favoriler")}</h1>
      <p className="lead">{tr("Beğendiğin ilanları ve kayıtlı aramalarını burada takip et. Fiyatı düşen ya da aramana uyan yeni ilanlar işaretlenir.")}</p>
      {authReady && !profile ? <div className="note" style={{ marginTop: 14 }}>{tr("Giriş yapmadan favorilerin yalnızca bu cihazda saklanır. ")}<a className="linkbtn" href="/giris">{tr("Giriş yap")}</a></div> : null}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="panel">
          <h3>{tr("Kayıtlı aramalar")}</h3>
          <p className="sub" style={{ margin: '4px 0 6px' }}>{tr("Yeni ilan çıkınca burada ve menüdeki rozette gösterilir. (SMS ve e-posta bildirimi sonraki aşamada.)")}</p>
          {saved.length === 0 ? <div className="empty">{tr("Kayıtlı aramın yok. İlanlar sayfasında filtreleri seç ve \"Aramayı kaydet\"e bas.")}</div> : saved.map((s) => {
            const n = newCount(s);
            const tot = filterListings(listings, sellers, s.f, myCity).length;
            return (
              <div key={s.id} className="mine">
                <div style={{ minWidth: 0 }}><b>{tr(filterLabel(s.f, language))}</b><br /><span className="sub">{tot} {tr(" ilan")}{n ? ' · ' : ''}{n ? <Pill cls="prem">{n} {tr(" yeni ilan")}</Pill> : null}</span></div>
                <div className="acts-row">
                  <label className="check"><input type="checkbox" checked={s.notify} onChange={(e) => void setNotify(s.id, e.target.checked)} />{tr("Yeni ilan bildir")}</label>
                  <button className="btn sm" type="button" onClick={() => void run(s.id)}>{tr("Çalıştır")}</button>
                  <button className="btn ghost sm" type="button" onClick={() => void deleteSaved(s.id)}>{tr("Sil")}</button>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <h2 style={{ marginBottom: 12 }}>{tr("Favori ilanlar")}</h2>
          {!authReady || !favoritesReady ? <div className="empty" role="status">{tr("Favori ilanlar yükleniyor…")}</div> : favoritesError ? <div className="panel" role="alert">{favoritesError} <button className="btn ghost" onClick={retryFavorites}>{tr("Tekrar dene")}</button></div> : favListings.length === 0 && unavailable.length === 0 ? <div className="empty">{tr("Henüz favorin yok. Bir ilandaki kalp düğmesine bas.")}</div> : (
            <div className="grid">
              {favListings.map((l) => {
                const was = favs[String(l.id)];
                return (
                  <div key={String(l.id)}>
                    <ListingCard l={l} />
                    {l.status && l.status !== 'active' ? <p className="note">{l.status === 'sold' ? tr("Bu ilan satıldı.") : tr("Bu ilan şu anda yayında değil.")}</p> : null}
                    {was > 0 && l.price < was ? <div className="note good" style={{ marginTop: 6 }}>{tr("Favoriye eklediğinden beri ")}<b>{formatTL(was - l.price, language)}</b> {tr(" düştü.")}</div> : null}
                  </div>
                );
              })}
              {unavailable.map(key => <div className="panel" key={key}><h3>{tr("İlan artık görüntülenemiyor")}</h3><p className="sub">{tr("İlan kaldırılmış veya erişime kapatılmış olabilir.")}</p><button className="btn ghost sm" onClick={() => void removeFav(key)}>{tr("Favorilerden çıkar")}</button></div>)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
