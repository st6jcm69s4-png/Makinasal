'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES, CITIES } from '@/lib/data/constants';
import { formatTL } from '@/lib/format';
import { isPartCategory } from '@/lib/pricing';
import {
  activeFilterCount, defaultFilters, defaultUnit, filterListings, MAX_PRICE, SORTS, sortListings, type Filters, type SortKey,
} from '@/lib/market';
import { filtersFromParams, filtersToParams } from '@/lib/searchParams';
import { ListingCard } from './ListingCard';
import { useMarket } from './MarketProvider';

function Browser() {
  const params = useSearchParams();
  const router = useRouter();
  const { listings, sellers, myCity, saveSearch, ready } = useMarket();
  const [f, setF] = useState<Filters>(() => filtersFromParams(params));
  const [sort, setSort] = useState<SortKey>(() => (SORTS.some(([k]) => k === params.get('sort')) ? (params.get('sort') as SortKey) : 'rec'));
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const paramString = params.toString();
  useEffect(() => {
    const next = new URLSearchParams(paramString);
    setF(filtersFromParams(next));
    setSort(SORTS.some(([k]) => k === next.get('sort')) ? next.get('sort') as SortKey : 'rec');
  }, [paramString]);
  useEffect(() => setPage(1), [f, sort]);
  const [q, setQ] = useState(f.q);
  useEffect(() => { setQ(f.q); }, [f.q]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const shown = useMemo(() => sortListings(filterListings(listings, sellers, f, myCity), sort, sellers, myCity), [listings, sellers, f, myCity, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / 24));
  const currentPage = Math.min(page, pages);
  const visible = shown.slice((currentPage - 1) * 24, currentPage * 24);
  const n = activeFilterCount(f);
  const part = isPartCategory(f.cat);
  const submit = (e: FormEvent) => {
    e.preventDefault(); const next = { ...f, q }; setF(next);
    const query = filtersToParams(next); if (sort !== 'rec') query.set('sort', sort);
    router.replace(`/ilanlar?${query.toString()}`, { scroll: false });
  };
  const pickCat = (c: string) => setF((cur) => ({ ...cur, cat: c, unit: c === 'Tümü' ? cur.unit : defaultUnit(c) }));
  const anyUse = f.useMin !== '' || f.useMax !== '';

  return (
    <>
      <h1>İlanlarda ara</h1>
      <form className="searchbar" role="search" onSubmit={submit}>
        <label className="sr" htmlFor="q">Marka veya model ara</label>
        <input type="text" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marka veya model ara. Örn. Hidromek, Scania" />
        <button className="btn ghost" type="button" aria-expanded={open} aria-controls="rail" onClick={() => setOpen(!open)}>
          Filtreler {n > 0 ? <span className="pill">{n}</span> : null}
        </button>
        <button className="btn" type="submit">Ara</button>
      </form>
      <div className={`layout${open ? '' : ' nofilter'}`}>
        {open ? (
          <aside className="rail" id="rail" aria-label="Filtreler">
            <div className="field"><span className="lbl">1. Araç türü</span>
              <div className="chips">
                {['Tümü', ...CATEGORIES].map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={f.cat === c} onClick={() => pickCat(c)}>{c}</button>
                ))}
              </div>
            </div>
            {!part ? (
              <>
                <div className="field"><span className="lbl">2. Kullanım (saat veya km)</span>
                  <div className="chips">
                    <button type="button" className="chip" aria-pressed={f.unit === 'sa'} onClick={() => set('unit', 'sa')}>Saat</button>
                    <button type="button" className="chip" aria-pressed={f.unit === 'km'} onClick={() => set('unit', 'km')}>Kilometre</button>
                  </div>
                  <div className="row-mm">
                    <input type="number" min={0} placeholder="En az" aria-label="En az kullanım" value={f.useMin} onChange={(e) => set('useMin', e.target.value)} />
                    <input type="number" min={0} placeholder="En çok" aria-label="En çok kullanım" value={f.useMax} onChange={(e) => set('useMax', e.target.value)} />
                  </div>
                  <span className="sub">{anyUse ? `Aralık girildi: yalnızca ${f.unit === 'sa' ? 'saatle' : 'km ile'} ölçülen ilanlar listelenir.` : 'Boş bırakırsan tüm ilanlar gelir. Mikser ve pompa için birimi sen seç.'}</span>
                </div>
                <div className="field"><span className="lbl">3. Model yılı</span>
                  <div className="row-mm">
                    <input type="number" min={1980} max={2030} placeholder="En eski" aria-label="En eski model yılı" value={f.yMin} onChange={(e) => set('yMin', e.target.value)} />
                    <input type="number" min={1980} max={2030} placeholder="En yeni" aria-label="En yeni model yılı" value={f.yMax} onChange={(e) => set('yMax', e.target.value)} />
                  </div>
                </div>
              </>
            ) : null}
            <div className="field"><label htmlFor="minScore">4. Satıcı puanı</label>
              <select id="minScore" value={f.minScore} onChange={(e) => set('minScore', Number(e.target.value))}>
                <option value={0}>Hepsi</option><option value={3}>3,0 ve üzeri</option><option value={4}>4,0 ve üzeri</option><option value={4.5}>4,5 ve üzeri</option>
              </select>
              <label className="check"><input type="checkbox" checked={f.incNew} onChange={(e) => set('incNew', e.target.checked)} />Puanı olmayan yeni üyeleri de göster</label>
            </div>
            <div className="field"><label htmlFor="city">Şehir</label>
              <select id="city" value={f.city} onChange={(e) => set('city', e.target.value)}>
                <option>Tümü</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="near">Bana uzaklık</label>
              <select id="near" value={f.near} onChange={(e) => set('near', Number(e.target.value))}>
                <option value={0}>Hepsi</option>{[50, 150, 300, 600].map((k) => <option key={k} value={k}>{k} km içinde</option>)}
              </select>
              <span className="sub">Konumun: {myCity}. Profilinden şehrini değiştirebilirsin.</span>
            </div>
            <div className="field"><label htmlFor="maxPrice">En yüksek fiyat</label>
              <input type="range" id="maxPrice" min={500000} max={MAX_PRICE} step={100000} value={f.maxPrice} onChange={(e) => set('maxPrice', Number(e.target.value))} />
              <span className="out">{f.maxPrice >= MAX_PRICE ? 'Sınır yok' : formatTL(f.maxPrice)}</span>
            </div>
            <label className="check"><input type="checkbox" checked={f.takas} onChange={(e) => set('takas', e.target.checked)} />Sadece takas kabul edenler</label>
            <label className="check"><input type="checkbox" checked={f.ver} onChange={(e) => set('ver', e.target.checked)} />Sadece doğrulanmış satıcılar</label>
            <label className="check"><input type="checkbox" checked={f.hide} onChange={(e) => set('hide', e.target.checked)} />Riskli satıcıları gizle</label>
            <button className="btn ghost" type="button" onClick={() => { setF(defaultFilters()); setQ(''); }}>Filtreleri sıfırla</button>
          </aside>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div className="bar">
            <span className="out" aria-live="polite">{ready ? `${shown.length} ilan` : 'Yükleniyor…'}</span>
            <div className="acts-row">
              <button className="btn ghost sm" type="button" onClick={() => void saveSearch(f)}>Aramayı kaydet</button>
              <label htmlFor="sort">Sırala</label>
              <select id="sort" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          {shown.length === 0 ? (
            <div className="empty">Bu filtrelerle ilan bulunamadı. Filtreleri gevşetmeyi dene.</div>
          ) : (
            <><div className="grid">{visible.map((l) => <ListingCard key={String(l.id)} l={l} />)}</div>{pages > 1 ? <nav className="acts-row" aria-label="Sonuç sayfaları" style={{ marginTop: 20 }}><button className="btn ghost" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Önceki</button><span role="status">{currentPage} / {pages}</span><button className="btn ghost" disabled={currentPage >= pages} onClick={() => setPage(p => p + 1)}>Sonraki</button></nav> : null}</>
          )}
        </div>
      </div>
    </>
  );
}

export function ListingBrowser() {
  return <Suspense fallback={<div className="empty">Yükleniyor…</div>}><Browser /></Suspense>;
}
