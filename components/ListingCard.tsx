'use client';

import type { Listing } from '@/lib/data/types';
import { formatNum, formatTL } from '@/lib/format';
import { distanceLabel } from '@/lib/geo';
import { cardTitle, listingKey, listingTitle, usageLabel } from '@/lib/listing';
import { isFeatured, tagsFor } from '@/lib/market';
import { isPartCategory } from '@/lib/pricing';
import { useMarket } from './MarketProvider';
import { IconCmp, IconFav, Pill } from './ui';

export function ListingCard({ l }: { l: Listing }) {
  const { sellers, stats, favs, toggleFav, cmp, toggleCmp, myCity } = useMarket();
  const s = sellers[l.sel];
  const key = listingKey(l);
  const part = isPartCategory(l.cat);
  const d = distanceLabel(myCity, l.city);
  const meta: string[] = [];
  if (part) { if (l.spec) meta.push(l.cat === 'Yedek parça' ? `Parça no: ${l.spec}` : l.spec); if (l.cond) meta.push(`${l.cond}${l.qty ? ` · ${formatNum(l.qty)} adet` : ''}`); }
  else if (usageLabel(l)) meta.push(usageLabel(l));
  meta.push(l.city + (d ? ` · ${d}` : ''));
  if (s) meta.push(s.name);
  const hasPhoto = !!l.photos && l.photos.length > 0;
  return (
    <article className={`card${isFeatured(l, s) ? ' feat' : ''}`}>
      <a href={`/ilanlar/${l.id}`} className="cm">
        {hasPhoto ? (
          <div className="thumb has">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.photos![0]} alt={listingTitle(l)} loading="lazy" />
            <span className="cat">{l.cat}</span>
            <span className="cnt">{l.photos!.length} fotoğraf</span>
          </div>
        ) : (
          <div className="thumb"><span className="cat">{l.cat}</span><span className="nophoto">Fotoğraf eklenmemiş</span></div>
        )}
        <div className="cbody">
          <div className="ttl">{cardTitle(l)}{l.demo ? <> <Pill>Demo</Pill></> : null}</div>
          <div className="price">{formatTL(l.price)}{part ? <span className="sub" style={{ font: '400 14px var(--f-body)' }}> / adet</span> : null}{l.prev && l.prev > l.price ? <span className="sub" style={{ textDecoration: 'line-through', font: '400 14px var(--f-body)', marginLeft: 8 }}>{formatTL(l.prev)}</span> : null}</div>
          <div className="meta">{meta.map((m, i) => <span key={i}>{m}</span>)}</div>
          <div className="tags">{tagsFor(l, s, stats).map((t, i) => <Pill key={i} cls={t.cls}>{t.text}</Pill>)}</div>
        </div>
      </a>
      <div className="card-acts">
        <button type="button" className="ibtn fav" aria-pressed={key in favs} aria-label="Favorilere ekle veya çıkar" onClick={() => void toggleFav(l)}><IconFav /></button>
        <button type="button" className="ibtn" aria-pressed={cmp.includes(key)} aria-label="Karşılaştırmaya ekle veya çıkar" onClick={() => toggleCmp(l)}><IconCmp /></button>
      </div>
    </article>
  );
}
