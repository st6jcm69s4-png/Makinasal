'use client';

import { useEffect, useState } from 'react';
import type { Listing, Seller } from '@/lib/data/types';
import { fetchReviews, fetchSellerListings, loadSellers } from '@/lib/dbListings';
import { trustLevel } from '@/lib/trust';
import { formatScore } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';
import { ListingCard } from './ListingCard';
import { useMarket } from './MarketProvider';
import { Avatar, Pill, Stars, toneClass } from './ui';

export function StoreView({ id }: { id: string }) {
  const { sellers, listings, ready } = useMarket();
  const [remote, setRemote] = useState<{ seller: Seller | null; list: Listing[] } | null>(null);
  const isDemo = !!sellers[id] && !/^[0-9a-f-]{36}$/.test(id);

  useEffect(() => {
    if (isDemo) return;
    const supabase = getSupabase();
    if (!supabase) { setRemote({ seller: null, list: [] }); return; }
    (async () => {
      const [map, list, reviews] = await Promise.all([loadSellers(supabase, [id]), fetchSellerListings(supabase, id), fetchReviews(supabase, id)]);
      const s = map[id] ?? null;
      if (s) s.reviews = reviews;
      setRemote({ seller: s, list });
    })();
  }, [id, isDemo]);

  const m = isDemo ? sellers[id] : remote?.seller;
  const list = isDemo ? listings.filter((l) => l.sel === id) : remote?.list ?? [];
  if (!ready || (!isDemo && !remote)) return <div className="empty">Yükleniyor…</div>;
  if (!m) return <div className="empty">Satıcı bulunamadı. <a className="linkbtn" href="/">Ana sayfa</a></div>;
  const lv = trustLevel(m);
  return (
    <>
      <a className="linkbtn" href="/">← Ana sayfa</a>
      <div className="panel" style={{ marginTop: 10 }}>
        <div className="prof-head">
          <Avatar name={m.name} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 34 }}>{m.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <Pill cls={toneClass(lv.tone)}>{lv.label}</Pill>
              {m.ver ? <Pill cls="good">Doğrulanmış</Pill> : <Pill>Doğrulanmadı</Pill>}
              {m.prem ? <Pill cls="prem">Premium</Pill> : null}
              <Pill>{m.type === 'Kurumsal' ? 'Mağaza' : 'Bireysel satıcı'}</Pill>
            </div>
          </div>
        </div>
        {m.bio && <section className="profile-bio"><h2>Hakkımda</h2><p>{m.bio}</p></section>}
        {m.type === 'Kurumsal' && m.companyBio && <section className="profile-bio"><h2>Şirket hakkında</h2><p>{m.companyBio}</p></section>}
        <div className="stat-grid">
          <div><span className="sub">Satıcı puanı</span><b>{formatScore(m.s)}</b></div>
          <div><span className="sub">Alıcı puanı</span><b>{formatScore(m.b)}</b></div>
          <div><span className="sub">Onaylı işlem</span><b>{m.deals}</b></div>
          <div><span className="sub">Doğrulanmış şikayet</span><b>{m.rep}</b></div>
          <div><span className="sub">Üyelik</span><b>{m.since}</b></div>
          <div><span className="sub">Şehir</span><b>{[m.city, m.district].filter(Boolean).join(' / ') || '–'}</b></div>
        </div>
      </div>
      <div className="sect">
        <div className="sect-h"><h2>İlanları ({list.length})</h2></div>
        {list.length ? <div className="grid">{list.map((l) => <ListingCard key={String(l.id)} l={l} />)}</div> : <div className="empty">Aktif ilan yok.</div>}
      </div>
      <div className="sect">
        <div className="sect-h"><h2>Değerlendirmeler ({m.reviews.length})</h2></div>
        <div className="panel">
          {isDemo ? <p className="sub" style={{ margin: '0 0 6px' }}>Bu bir demo satıcıdır; yorumlar örnektir.</p> : null}
          {m.reviews.length ? m.reviews.map((r, i) => (
            <div key={i} className="rv">
              <div className="acts-row" style={{ justifyContent: 'space-between' }}><b>{r.who} <span className="sub">({r.role})</span></b><span><Stars n={r.rating} /> <span className="sub">{r.date}</span></span></div>
              <div>{r.text}</div>
              {r.tags.length ? <div className="tags" style={{ marginTop: 6 }}>{r.tags.map((x) => <Pill key={x}>{x}</Pill>)}</div> : null}
            </div>
          )) : <div className="empty">Henüz değerlendirme yok.</div>}
        </div>
      </div>
    </>
  );
}
