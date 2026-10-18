'use client';
import { useLanguage } from "@/components/LanguageProvider";


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
  const { t: tr, language } = useLanguage();

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
  if (!ready || (!isDemo && !remote)) return <div className="empty">{tr("Yükleniyor…")}</div>;
  if (!m) return <div className="empty">{tr("Satıcı bulunamadı. ")}<a className="linkbtn" href="/">{tr("Ana sayfa")}</a></div>;
  const lv = trustLevel(m);
  return (
    <>
      <a className="linkbtn" href="/">{tr("← Ana sayfa")}</a>
      <div className="panel" style={{ marginTop: 10 }}>
        <div className="prof-head">
          <Avatar name={m.name} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 34 }}>{m.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <Pill cls={toneClass(lv.tone)}>{tr(lv.label)}</Pill>
              {m.ver ? <Pill cls="good">{tr("Doğrulanmış")}</Pill> : <Pill>{tr("Doğrulanmadı")}</Pill>}
              {m.prem ? <Pill cls="prem">{tr("Premium")}</Pill> : null}
              <Pill>{m.type === 'Kurumsal' ? tr("Mağaza") : tr("Bireysel satıcı")}</Pill>
            </div>
          </div>
        </div>
        {m.bio && <section className="profile-bio"><h2>{tr("Hakkımda")}</h2><p>{m.bio}</p></section>}
        {m.type === 'Kurumsal' && m.companyBio && <section className="profile-bio"><h2>{tr("Şirket hakkında")}</h2><p>{m.companyBio}</p></section>}
        <div className="stat-grid">
          <div><span className="sub">{tr("Satıcı puanı")}</span><b>{formatScore(m.s, language)}</b></div>
          <div><span className="sub">{tr("Alıcı puanı")}</span><b>{formatScore(m.b, language)}</b></div>
          <div><span className="sub">{tr("Onaylı işlem")}</span><b>{m.deals}</b></div>
          <div><span className="sub">{tr("Doğrulanmış şikayet")}</span><b>{m.rep}</b></div>
          <div><span className="sub">{tr("Üyelik")}</span><b>{m.since}</b></div>
          <div><span className="sub">{tr("Şehir")}</span><b>{[m.city, m.district].filter(Boolean).join(' / ') || '–'}</b></div>
        </div>
      </div>
      <div className="sect">
        <div className="sect-h"><h2>{tr("İlanları (")}{list.length})</h2></div>
        {list.length ? <div className="grid">{list.map((l) => <ListingCard key={String(l.id)} l={l} />)}</div> : <div className="empty">{tr("Aktif ilan yok.")}</div>}
      </div>
      <div className="sect">
        <div className="sect-h"><h2>{tr("Değerlendirmeler (")}{m.reviews.length})</h2></div>
        <div className="panel">
          {isDemo ? <p className="sub" style={{ margin: '0 0 6px' }}>{tr("Bu bir demo satıcıdır; yorumlar örnektir.")}</p> : null}
          {m.reviews.length ? m.reviews.map((r, i) => (
            <div key={i} className="rv">
              <div className="acts-row" style={{ justifyContent: 'space-between' }}><b>{r.who} <span className="sub">({r.role})</span></b><span><Stars n={r.rating} /> <span className="sub">{r.date}</span></span></div>
              <div>{r.text}</div>
              {r.tags.length ? <div className="tags" style={{ marginTop: 6 }}>{r.tags.map((x) => <Pill key={x}>{x}</Pill>)}</div> : null}
            </div>
          )) : <div className="empty">{tr("Henüz değerlendirme yok.")}</div>}
        </div>
      </div>
    </>
  );
}
