"use client";
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import type { Listing } from '@/lib/data/types';
import { formatTL } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';
import { CONDITION_FIELDS, formatTech, techFieldsFor } from '@/lib/techSpecs';

/** Web ilan sayfasında mobil ile aynı kapsam: video, teknik alanlar, bakım beyanı, açık artırma durumu. */

export function techRows(l: Listing): [string, string][] {
  return techFieldsFor(l.cat)
    .map((f) => [f.label, formatTech(f, l.tech?.[f.key])] as [string, string | null])
    .filter((r): r is [string, string] => r[1] !== null);
}

const YT = /youtu\.be\/([A-Za-z0-9_-]{6,})|[?&]v=([A-Za-z0-9_-]{6,})|shorts\/([A-Za-z0-9_-]{6,})/;

export function ListingVideo({ l }: { l: Listing }) {
  const { t } = useLanguage();
  if (l.videoPath) {
    const src = getSupabase()?.storage.from('listing-videos').getPublicUrl(l.videoPath).data.publicUrl;
    if (!src) return null;
    return (
      <div className="panel">
        <h3>{t('Video')}</h3>
        <video src={src} controls preload="metadata" playsInline style={{ width: '100%', maxHeight: 460, borderRadius: 12, background: '#000' }} />
      </div>
    );
  }
  if (l.videoUrl && /^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(l.videoUrl)) {
    const m = YT.exec(l.videoUrl);
    const id = m ? m[1] ?? m[2] ?? m[3] : null;
    return (
      <div className="panel">
        <h3>{t('Video')}</h3>
        {id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={t('Video')}
            style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 12 }}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <a className="btn ghost" href={l.videoUrl} target="_blank" rel="noopener noreferrer">{t('Videoyu izle')}</a>
        )}
      </div>
    );
  }
  return null;
}

export function ConditionPanel({ l }: { l: Listing }) {
  const { t } = useLanguage();
  const rows = CONDITION_FIELDS.map((f) => [f.label, formatTech(f, l.tech?.[f.key])] as [string, string | null]).filter((r): r is [string, string] => r[1] !== null);
  if (!rows.length) return null;
  return (
    <div className="panel">
      <h3>{t('Bakım ve durum')} <span className="pill" style={{ marginLeft: 6 }}>{t('Satıcı beyanı')}</span></h3>
      <table><tbody>{rows.map(([k, v]) => <tr key={k}><th>{t(k)}</th><td>{v}</td></tr>)}</tbody></table>
    </div>
  );
}

type Auction = { id: string; status: string; ends_at: string; current_price: number | string | null; start_price: number | string; bid_count: number; min_increment: number | string };

function left(ends: string, now: number, t: (s: string) => string) {
  let s = Math.max(0, Math.floor((Date.parse(ends) - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return d > 0 ? `${d} ${t('gün')} ${h} ${t('sa')}` : h > 0 ? `${h} ${t('sa')} ${m} ${t('dk')}` : `${m} ${t('dk')}`;
}

/** Açık artırma durumu (webde salt okunur; teklif uygulamadan verilir). */
export function AuctionStatus({ listingId }: { listingId: string }) {
  const { t, language } = useLanguage();
  const [a, setA] = useState<Auction | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !/^[0-9a-f-]{36}$/i.test(listingId)) return;
    let alive = true;
    const load = () => void sb.from('auctions').select('id,status,ends_at,current_price,start_price,bid_count,min_increment')
      .eq('listing_id', listingId).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (alive) setA((data as Auction | null) ?? null); });
    load();
    const p = setInterval(load, 30000);
    const c = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(p); clearInterval(c); };
  }, [listingId]);
  if (!a) return null;
  const live = a.status === 'active' && Date.parse(a.ends_at) > now;
  if (!live && Date.parse(a.ends_at) < now - 7 * 86400000) return null;
  return (
    <div className="panel" style={{ borderColor: 'var(--teal, #0D7468)' }}>
      <h3>{live ? t('Açık artırma') : t('Açık artırma sona erdi')}</h3>
      <div className="price" style={{ fontSize: 28 }}>{formatTL(Number(a.current_price ?? a.start_price), language)}</div>
      <p className="sub">
        {a.current_price == null ? t('Başlangıç fiyatı') : live ? t('Güncel teklif') : t('Son teklif')} · {a.bid_count} {t('teklif')}
        {live ? <> · {t('Kalan süre')}: <b>{left(a.ends_at, now, t)}</b></> : null}
      </p>
      {live ? <p className="note">{t('Teklif vermek için Makinasal uygulamasını kullan. Açık artırmalara yalnızca Pro ve Firma Pro üyeler katılabilir.')}</p> : null}
    </div>
  );
}
