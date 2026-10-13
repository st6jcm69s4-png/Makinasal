'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, CITIES } from '@/lib/data/constants';
import type { Listing, Seller } from '@/lib/data/types';
import { listingTitle } from '@/lib/listing';
import { ListingCard } from './ListingCard';

type Sort = 'new' | 'priceAsc' | 'priceDesc';

export function ListingBrowser({ listings, sellers }: { listings: Listing[]; sellers: Record<string, Seller> }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [city, setCity] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sort, setSort] = useState<Sort>('new');

  const shown = useMemo(() => {
    const text = q.trim().toLocaleLowerCase('tr');
    const lo = min ? Number(min) : 0;
    const hi = max ? Number(max) : Infinity;
    const out = listings.filter(
      (l) =>
        (!cat || l.cat === cat) &&
        (!city || l.city === city) &&
        l.price >= lo &&
        l.price <= hi &&
        (!text || `${listingTitle(l)} ${l.cat} ${l.desc}`.toLocaleLowerCase('tr').includes(text)),
    );
    if (sort === 'priceAsc') out.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') out.sort((a, b) => b.price - a.price);
    else out.sort((a, b) => b.id - a.id);
    return out;
  }, [listings, q, cat, city, min, max, sort]);

  function reset() {
    setQ(''); setCat(''); setCity(''); setMin(''); setMax(''); setSort('new');
  }

  return (
    <div className="layout">
      <aside className="panel filters" aria-label="Filtreler">
        <label htmlFor="q">Ara</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="marka, model…" />
        <label htmlFor="cat">Kategori</label>
        <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Tümü</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="city">Şehir</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Tümü</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label>Fiyat (₺)</label>
        <div className="row">
          <input aria-label="En düşük fiyat" inputMode="numeric" placeholder="En az" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} />
          <input aria-label="En yüksek fiyat" inputMode="numeric" placeholder="En çok" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} />
        </div>
        <label htmlFor="sort">Sırala</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="new">En yeni</option>
          <option value="priceAsc">Fiyat: düşükten yükseğe</option>
          <option value="priceDesc">Fiyat: yüksekten düşüğe</option>
        </select>
        <p style={{ marginBottom: 0 }}><button className="btn ghost" onClick={reset} type="button">Filtreleri temizle</button></p>
      </aside>
      <section aria-live="polite">
        <p className="sub">{shown.length} ilan</p>
        {shown.length === 0 ? (
          <div className="panel empty">Bu filtrelerle ilan bulunamadı.</div>
        ) : (
          <div className="grid">
            {shown.map((l) => <ListingCard key={l.id} l={l} seller={sellers[l.sel]} />)}
          </div>
        )}
      </section>
    </div>
  );
}
