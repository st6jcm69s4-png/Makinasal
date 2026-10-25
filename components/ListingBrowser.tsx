"use client";
import { searchListings } from "@/lib/dbListings";
import { searchRequest } from "@/lib/searchRequest";
import { getSupabase } from "@/lib/supabase/client";
import type { Listing } from "@/lib/data/types";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { useLanguage } from "@/components/LanguageProvider";


import { useSearchParams } from "next/navigation";
import { CityMap } from "./CityMap";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { CITIES } from "@/lib/data/constants";
import { formatTL } from "@/lib/format";
import { isPartCategory } from "@/lib/pricing";
import {
  activeFilterCount,
  defaultFilters,
  defaultUnit,
  filterListings,
  MAX_PRICE,
  SORTS,
  sortListings,
  type Filters,
  type SortKey,
} from "@/lib/market";
import { filtersFromParams, filtersToParams } from "@/lib/searchParams";
import { categoryMatches } from "@/lib/machineryCatalog";
import { CategoryFilterList, BrandField } from "./CatalogControls";
import { ListingCard } from "./ListingCard";
import { useMarket } from "./MarketProvider";

function Browser() {
  const { t: tr, language } = useLanguage();

  const params = useSearchParams();
  const { listings, sellers, myCity, saveSearch, ready, rememberListings } = useMarket();
  const [f, setF] = useState<Filters>(() => filtersFromParams(params));
  const [sort, setSort] = useState<SortKey>(() =>
    SORTS.some(([k]) => k === params.get("sort"))
      ? (params.get("sort") as SortKey)
      : "rec",
  );
  const [open, setOpen] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [page, setPage] = useState(1);
  const paramString = params.toString();
  useEffect(() => {
    const next = new URLSearchParams(paramString);
    setF(filtersFromParams(next));
    setSort(
      SORTS.some(([k]) => k === next.get("sort"))
        ? (next.get("sort") as SortKey)
        : "rec",
    );
  }, [paramString]);
  useEffect(() => setPage(1), [f, sort]);
  const [q, setQ] = useState(f.q);
  useEffect(() => {
    setQ(f.q);
  }, [f.q]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setF((cur) => ({ ...cur, [k]: v }));
  const [result,setResult] = useState<{listings:Listing[];total:number}>({listings:[],total:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  useEffect(()=>{
    if(demo) {setLoading(false);return;}
    let live=true; setLoading(true);setError('');
    const timer=setTimeout(()=>{void searchListings(getSupabase(),searchRequest(f,sort,page,myCity)).then(data=>{
      if(!live)return; rememberListings(data);setResult(data);setLoading(false);
      if(page>Math.max(1,Math.ceil(data.total/24)))setPage(Math.max(1,Math.ceil(data.total/24)));
    }).catch(()=>{if(live){setError('Arama yüklenemedi. Lütfen tekrar dene.');setLoading(false);}});},180);
    return()=>{live=false;clearTimeout(timer);};
  },[f,sort,page,myCity,attempt,demo,rememberListings]);
  const demoShown=useMemo(()=>demo?sortListings(filterListings(listings,sellers,f,myCity),sort,sellers,myCity):[],[demo,listings,sellers,f,myCity,sort]);
  const total=demo?demoShown.length:result.total;
  const pages=Math.max(1,Math.ceil(total/24));
  const currentPage=Math.min(page,pages);
  const visible=demo?demoShown.slice((currentPage-1)*24,currentPage*24):result.listings;
  const n = activeFilterCount(f);
  const part = isPartCategory(f.cat);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { ...f, q };
    setF(next);
    const query = filtersToParams(next);
    if (sort !== "rec") query.set("sort", sort);
    window.location.assign(`/ilanlar?${query.toString()}`);
  };
  const pickCat = (c: string) =>
    setF((cur) => ({
      ...cur,
      cat: c,
      brand: "",
      unit: c === "Tümü" ? cur.unit : defaultUnit(c),
    }));
  const anyUse = f.useMin !== "" || f.useMax !== "";

  return (
    <>
      <h1>{tr("İlanlarda ara")}</h1>
      <form className="searchbar" role="search" onSubmit={submit}>
        <label className="sr" htmlFor="q">
          {tr("Marka veya model ara")}</label>
        <SearchAutocomplete
          type="search"
          scope="sale"
          city={f.city}
          id="q"
          value={q}
          onValueChange={setQ}
          placeholder={tr("Marka veya model ara. Örn. Hidromek, Scania")}
        />
        <button
          className="btn ghost"
          type="button"
          aria-expanded={open}
          aria-controls="rail"
          onClick={() => setOpen(!open)}
        >
          {tr("Filtreler ")}{n > 0 ? <span className="pill">{n}</span> : null}
        </button>
        <button className="btn" type="submit">
          {tr("Ara")}</button>
      </form>
      <div className={`layout${open ? "" : " nofilter"}`}>
        {open ? (
          <aside className="rail" id="rail" aria-label={tr("Filtreler")}>
            <div className="field">
              <span className="lbl">{tr("1. Araç türü")}</span>
              <CategoryFilterList value={f.cat} onChange={pickCat} />
            </div>
            <div className="field">
              <BrandField
                category={f.cat}
                value={f.brand ?? ""}
                onChange={(v) => set("brand", v)}
                observed={listings
                  .filter((l) => categoryMatches(l.cat, f.cat))
                  .map((l) => l.brand || "")
                  .filter(Boolean)}
              />
              <span className="sub">
                {tr("Boş bırakırsan tüm markalar gösterilir.")}</span>
            </div>
            {!part ? (
              <>
                <div className="field">
                  <span className="lbl">{tr("2. Kullanım (saat veya km)")}</span>
                  <div className="chips">
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={f.unit === "sa"}
                      onClick={() => set("unit", "sa")}
                    >
                      {tr("Saat")}</button>
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={f.unit === "km"}
                      onClick={() => set("unit", "km")}
                    >
                      {tr("Kilometre")}</button>
                  </div>
                  <div className="row-mm">
                    <input
                      type="number"
                      min={0}
                      placeholder={tr("En az")}
                      aria-label={tr("En az kullanım")}
                      value={f.useMin}
                      onChange={(e) => set("useMin", e.target.value)}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder={tr("En çok")}
                      aria-label={tr("En çok kullanım")}
                      value={f.useMax}
                      onChange={(e) => set("useMax", e.target.value)}
                    />
                  </div>
                  <span className="sub">
                    {anyUse
                      ? tr("Aralık girildi: yalnızca {0} ölçülen ilanlar listelenir.", {"0":f.unit === "sa" ? "saatle" : "km ile"})
                      : tr("Boş bırakırsan tüm ilanlar gelir. Mikser ve pompa için birimi sen seç.")}
                  </span>
                </div>
                <div className="field">
                  <span className="lbl">{tr("3. Model yılı")}</span>
                  <div className="row-mm">
                    <input
                      type="number"
                      min={1980}
                      max={2030}
                      placeholder={tr("En eski")}
                      aria-label={tr("En eski model yılı")}
                      value={f.yMin}
                      onChange={(e) => set("yMin", e.target.value)}
                    />
                    <input
                      type="number"
                      min={1980}
                      max={2030}
                      placeholder={tr("En yeni")}
                      aria-label={tr("En yeni model yılı")}
                      value={f.yMax}
                      onChange={(e) => set("yMax", e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : null}
            <div className="field">
              <label htmlFor="minScore">{tr("4. Satıcı puanı")}</label>
              <select
                id="minScore"
                value={f.minScore}
                onChange={(e) => set("minScore", Number(e.target.value))}
              >
                <option value={0}>{tr("Hepsi")}</option>
                <option value={3}>{tr("3,0 ve üzeri")}</option>
                <option value={4}>{tr("4,0 ve üzeri")}</option>
                <option value={4.5}>{tr("4,5 ve üzeri")}</option>
              </select>
              <label className="check">
                <input
                  type="checkbox"
                  checked={f.incNew}
                  onChange={(e) => set("incNew", e.target.checked)}
                />
                {tr("Puanı olmayan yeni üyeleri de göster")}</label>
            </div>
            <div className="field">
              <label htmlFor="city">{tr("Şehir")}</label>
              <select
                id="city"
                value={f.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="Tümü">{tr("Tümü")}</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{tr(c)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="near">{tr("Bana uzaklık")}</label>
              <select
                id="near"
                value={f.near}
                onChange={(e) => set("near", Number(e.target.value))}
              >
                <option value={0}>{tr("Hepsi")}</option>
                {[50, 150, 300, 600].map((k) => (
                  <option key={k} value={k}>
                    {k} {tr(" km içinde")}</option>
                ))}
              </select>
              <span className="sub">
                {tr("Konumun: ")}{myCity}{tr(". Profilinden şehrini değiştirebilirsin.")}</span>
            </div>
            <div className="field">
              <label htmlFor="maxPrice">{tr("En yüksek fiyat")}</label>
              <input
                type="range"
                id="maxPrice"
                min={500000}
                max={MAX_PRICE}
                step={100000}
                value={f.maxPrice}
                onChange={(e) => set("maxPrice", Number(e.target.value))}
              />
              <span className="out">
                {f.maxPrice >= MAX_PRICE ? tr("Sınır yok") : formatTL(f.maxPrice, language)}
              </span>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={f.takas}
                onChange={(e) => set("takas", e.target.checked)}
              />
              {tr("Sadece takas kabul edenler")}</label>
            <label className="check">
              <input
                type="checkbox"
                checked={f.ver}
                onChange={(e) => set("ver", e.target.checked)}
              />
              {tr("Sadece doğrulanmış satıcılar")}</label>
            <label className="check">
              <input
                type="checkbox"
                checked={f.hide}
                onChange={(e) => set("hide", e.target.checked)}
              />
              {tr("Riskli satıcıları gizle")}</label>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setF(defaultFilters());
                setQ("");
              }}
            >
              {tr("Filtreleri sıfırla")}</button>
          </aside>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div className="bar">
            <span className="out" aria-live="polite">
              {!loading ? tr("{0} ilan", {"0":total}) : tr("Yükleniyor…")}
            </span>
            <div className="acts-row">
              <button
                className="btn ghost sm"
                type="button"
                onClick={() => void saveSearch(f)}
              >
                {tr("Aramayı kaydet")}</button>
              <button className="btn ghost sm" type="button" aria-pressed={mapView} onClick={() => setMapView((v) => !v)}>
                {tr(mapView ? "Liste görünümü" : "Harita görünümü")}</button>
              <label htmlFor="sort">{tr("Sırala")}</label>
              <select
                id="sort"
                style={{ width: "auto" }}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORTS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {tr(label)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mapView ? <CityMap onPick={(c) => { set("city", c); setMapView(false); }} /> : error ? <div className="empty" role="alert">{tr(error)} <button className="btn ghost" onClick={()=>setAttempt(n=>n+1)}>{tr("Tekrar dene")}</button></div> : loading ? <div className="empty" role="status">{tr("Yükleniyor…")}</div> : total === 0 ? (
            <div className="empty">
              {tr("Bu filtrelerle ilan bulunamadı. Filtreleri gevşetmeyi dene.")}</div>
          ) : (
            <>
              <div className="grid">
                {visible.map((l) => (
                  <ListingCard key={String(l.id)} l={l} />
                ))}
              </div>
              {pages > 1 ? (
                <nav
                  className="acts-row"
                  aria-label={tr("Sonuç sayfaları")}
                  style={{ marginTop: 20 }}
                >
                  <button
                    className="btn ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {tr("Önceki")}</button>
                  <span role="status">
                    {currentPage} / {pages}
                  </span>
                  <button
                    className="btn ghost"
                    disabled={currentPage >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {tr("Sonraki")}</button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function ListingBrowser() {
  const { t: tr, language } = useLanguage();

  return (
    <Suspense fallback={<div className="empty">{tr("Yükleniyor…")}</div>}>
      <Browser />
    </Suspense>
  );
}
