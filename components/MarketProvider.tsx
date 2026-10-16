'use client';

import type { QueryResult } from '@/lib/supabase/result';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LISTINGS } from '@/lib/data/listings';
import { SELLERS } from '@/lib/data/sellers';
import type { Listing, Seller } from '@/lib/data/types';
import { fetchActiveListings } from '@/lib/dbListings';
import { listingKey, cardTitle } from '@/lib/listing';
import { defaultFilters, filterListings, type Filters } from '@/lib/market';
import { buildPriceStats, type PriceStats } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase/client';

export type Profile = {
  id: string; email: string; full_name: string; city: string; is_store: boolean; store_name: string;
  is_premium: boolean; verified_phone: boolean; verified_id: boolean; verified_tax: boolean; created_at: string;
};
export type SavedSearch = { id: string; f: Filters; notify: boolean; lastSeen: string; local?: boolean };

type Ctx = {
  ready: boolean;
  listings: Listing[];
  sellers: Record<string, Seller>;
  stats: PriceStats;
  profile: Profile | null;
  authReady: boolean;
  myCity: string;
  favs: Record<string, number>;
  toggleFav: (l: Listing) => Promise<void>;
  cmp: string[];
  toggleCmp: (l: Listing) => void;
  removeCmp: (key: string) => void;
  clearCmp: () => void;
  saved: SavedSearch[];
  saveSearch: (f: Filters) => Promise<void>;
  deleteSaved: (id: string) => Promise<void>;
  setNotify: (id: string, on: boolean) => Promise<void>;
  markSeen: (id: string) => Promise<void>;
  newCount: (s: SavedSearch) => number;
  unread: number;
  refreshUnread: () => Promise<void>;
  favNews: number;
  toast: (m: string) => void;
  reload: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  find: (id: string | number) => Listing | null;
};

const MarketCtx = createContext<Ctx | null>(null);
export const useMarket = () => {
  const c = useContext(MarketCtx);
  if (!c) throw new Error('MarketProvider eksik');
  return c;
};

const DEMO: Listing[] = LISTINGS.map((l) => ({ ...l, demo: true }));
const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_SELLERS = SHOW_DEMO ? SELLERS : {};

function lsGet<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* özel pencere vb. */ } }

export function MarketProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<{ listings: Listing[]; sellers: Record<string, Seller> }>({ listings: [], sellers: {} });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favs, setFavs] = useState<Record<string, number>>({});
  const [cmp, setCmp] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [unread, setUnread] = useState(0);
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionVersion = useRef(0);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3600);
  }, []);

  const reload = useCallback(async () => {
    try {
      const d = await fetchActiveListings(getSupabase());
      setDb(d); setLoadError('');
    } catch { setLoadError('Güncel ilanlar yüklenemedi. Görünen ilanlar güncel olmayabilir.'); }
    finally { setReady(true); }
  }, []);

  const loadProfile = useCallback(async (uid: string | null, email = '', version = sessionVersion.current) => {
    const supabase = getSupabase();
    if (!supabase || !uid) { setProfile(null); return; }
    let res = await supabase.from('profiles')
      .select('id,full_name,city,is_store,store_name,is_premium,verified_phone,verified_id,verified_tax,created_at').eq('id', uid).maybeSingle();
    if (res.error) {
      res = await supabase.from('profiles')
        .select('id,full_name,city,is_store,store_name,is_premium,verified_phone,created_at').eq('id', uid).maybeSingle();
    }
    if (version !== sessionVersion.current) return;
    const p = res.data as Record<string, unknown> | null;
    setProfile({
      id: uid, email,
      full_name: (p?.full_name as string) ?? '', city: (p?.city as string) ?? '',
      is_store: !!p?.is_store, store_name: (p?.store_name as string) ?? '',
      is_premium: !!p?.is_premium, verified_phone: !!p?.verified_phone,
      verified_id: !!p?.verified_id, verified_tax: !!p?.verified_tax,
      created_at: (p?.created_at as string) ?? new Date().toISOString(),
    });
  }, []);

  const loadUserData = useCallback(async (uid: string | null, version = sessionVersion.current) => {
    const supabase = getSupabase();
    const localFavs = lsGet<Record<string, number>>('mk-favs', {});
    if (!supabase || !uid) {
      setFavs(localFavs);
      setSaved(lsGet<SavedSearch[]>('mk-saved', []).map((s) => ({ ...s, local: true })));
      return;
    }
    let fr: QueryResult = await supabase.from('favorites').select('listing_id,price_at_save').eq('user_id', uid);
    if (fr.error) fr = await supabase.from('favorites').select('listing_id').eq('user_id', uid);
    const out: Record<string, number> = { ...localFavs };
    for (const r of (fr.data ?? []) as unknown as { listing_id: string; price_at_save?: number | string | null }[]) {
      out[r.listing_id] = r.price_at_save != null ? Number(r.price_at_save) : 0;
    }
    if (version !== sessionVersion.current) return;
    setFavs(out);
    let sr: QueryResult = await supabase.from('saved_searches').select('id,query,notify,last_seen_at,created_at').eq('user_id', uid);
    if (sr.error) sr = await supabase.from('saved_searches').select('id,query,created_at').eq('user_id', uid);
    if (version !== sessionVersion.current) return;
    setSaved(((sr.data ?? []) as unknown as { id: string; query: { f?: Filters }; notify?: boolean; last_seen_at?: string; created_at: string }[])
      .filter((r) => r.query?.f)
      .map((r) => ({
        id: r.id, f: { ...defaultFilters(), ...r.query.f }, notify: r.notify ?? true,
        lastSeen: r.last_seen_at ?? r.created_at,
      })));
  }, []);

  const refreshUnread = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase.rpc('unread_counts');
    if (error || !data) { setUnread(0); return; }
    setUnread((data as { n: number | string }[]).reduce((a, r) => a + Number(r.n), 0));
  }, []);

  // İlk yükleme + oturum değişimi
  useEffect(() => {
    try { setCmp(JSON.parse(sessionStorage.getItem('mk-cmp') ?? '[]')); } catch { /* yok say */ }
    void reload();
    const supabase = getSupabase();
    if (!supabase) { void loadUserData(null); setAuthReady(true); return; }
    const apply = async (u: { id: string; email?: string | null } | null | undefined, version: number) => {
      await Promise.all([loadProfile(u?.id ?? null, u?.email ?? '', version), loadUserData(u?.id ?? null, version)]);
      if (version !== sessionVersion.current) return;
      if (u) void refreshUnread(); else setUnread(0);
      setAuthReady(true);
    };
    let disposed = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    // Supabase API calls must run after the auth callback releases its lock.
    const schedule = (u: { id: string; email?: string | null } | null) => {
      const version = ++sessionVersion.current;
      clearTimeout(pending);
      pending = setTimeout(() => {
        if (!disposed) void apply(u, version).catch(() => {
          if (!disposed) { setAuthReady(true); toast('Hesap bilgileri yüklenemedi. Sayfayı yenileyerek tekrar dene.'); }
        });
      }, 0);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'TOKEN_REFRESHED') schedule(session?.user ?? null);
    });
    return () => { disposed = true; sessionVersion.current++; clearTimeout(pending); sub.subscription.unsubscribe(); };
  }, [reload, loadProfile, loadUserData, refreshUnread, toast]);

  useEffect(() => {
    if (!profile) return;
    const id = setInterval(() => { if (!document.hidden) void refreshUnread(); }, 20000);
    return () => clearInterval(id);
  }, [profile, refreshUnread]);

  const sellers = useMemo(() => ({ ...DEMO_SELLERS, ...db.sellers }), [db.sellers]);
  const listings = useMemo(() => [...db.listings, ...(SHOW_DEMO ? DEMO : [])], [db.listings]);
  const stats = useMemo(() => buildPriceStats(listings), [listings]);
  const myCity = profile?.city || 'İstanbul';
  const find = useCallback((id: string | number) => listings.find((l) => String(l.id) === String(id)) ?? null, [listings]);

  const toggleFav = useCallback(async (l: Listing) => {
    const key = listingKey(l);
    const had = key in favs;
    const next = { ...favs };
    if (had) delete next[key]; else next[key] = l.price;
    setFavs(next);
    const isDemo = typeof l.id === 'number';
    if (isDemo || !profile) {
      const local = lsGet<Record<string, number>>('mk-favs', {});
      if (had) delete local[key]; else local[key] = l.price;
      lsSet('mk-favs', local);
      if (!isDemo && !profile) toast('Favoriler bu cihazda saklanıyor. Hesabına kaydetmek için giriş yap.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const res = had
      ? await supabase.from('favorites').delete().eq('user_id', profile.id).eq('listing_id', key)
      : await supabase.from('favorites').insert({ user_id: profile.id, listing_id: key });
    if (res.error) { setFavs(favs); toast('Favori kaydedilemedi: ' + res.error.message); }
  }, [favs, profile, toast]);

  const persistCmp = (v: string[]) => { try { sessionStorage.setItem('mk-cmp', JSON.stringify(v)); } catch { /* yok say */ } };
  const toggleCmp = useCallback((l: Listing) => {
    const key = listingKey(l);
    setCmp((cur) => {
      let next: string[];
      if (cur.includes(key)) next = cur.filter((k) => k !== key);
      else if (cur.length >= 3) { toast('En fazla 3 ilan karşılaştırılabilir.'); return cur; }
      else next = [...cur, key];
      persistCmp(next);
      return next;
    });
  }, [toast]);
  const removeCmp = useCallback((key: string) => setCmp((c) => { const n = c.filter((k) => k !== key); persistCmp(n); return n; }), []);
  const clearCmp = useCallback(() => { setCmp([]); persistCmp([]); }, []);

  const saveSearch = useCallback(async (f: Filters) => {
    const now = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase && profile) {
      const ins = await supabase.from('saved_searches').insert({ user_id: profile.id, query: { f } }).select('id').single();
      if (ins.error) { toast('Arama kaydedilemedi: ' + ins.error.message); return; }
      await loadUserData(profile.id);
    } else {
      const next = [...lsGet<SavedSearch[]>('mk-saved', []), { id: String(Date.now()), f, notify: true, lastSeen: now }];
      lsSet('mk-saved', next);
      setSaved(next.map((s) => ({ ...s, local: true })));
    }
    toast('Arama kaydedildi. Favoriler sekmesinde görebilirsin.');
  }, [profile, toast, loadUserData]);

  const patchSaved = useCallback(async (id: string, patch: Partial<{ notify: boolean; lastSeen: string }>) => {
    setSaved((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const s = saved.find((x) => x.id === id);
    if (!s) return;
    if (s.local || !profile) {
      const all = lsGet<SavedSearch[]>('mk-saved', []).map((x) => (x.id === id ? { ...x, ...patch } : x));
      lsSet('mk-saved', all);
      return;
    }
    const supabase = getSupabase();
    const row: Record<string, unknown> = {};
    if (patch.notify !== undefined) row.notify = patch.notify;
    if (patch.lastSeen !== undefined) row.last_seen_at = patch.lastSeen;
    const result = await supabase?.from('saved_searches').update(row).eq('id', id).eq('user_id', profile.id);
    if (result?.error) { await loadUserData(profile.id); toast('Arama güncellenemedi. Tekrar dene.'); }
  }, [saved, profile, loadUserData, toast]);

  const deleteSaved = useCallback(async (id: string) => {
    const s = saved.find((x) => x.id === id);
    setSaved((cur) => cur.filter((x) => x.id !== id));
    if (!s) return;
    if (s.local || !profile) lsSet('mk-saved', lsGet<SavedSearch[]>('mk-saved', []).filter((x) => x.id !== id));
    else {
      const result = await getSupabase()?.from('saved_searches').delete().eq('id', id).eq('user_id', profile.id);
      if (result?.error) { await loadUserData(profile.id); toast('Arama silinemedi. Tekrar dene.'); }
    }
  }, [saved, profile, loadUserData, toast]);

  const setNotify = useCallback((id: string, on: boolean) => patchSaved(id, { notify: on }), [patchSaved]);
  const markSeen = useCallback((id: string) => patchSaved(id, { lastSeen: new Date().toISOString() }), [patchSaved]);

  const newCount = useCallback((s: SavedSearch) => {
    const since = Date.parse(s.lastSeen);
    return filterListings(listings, sellers, s.f, myCity).filter((l) => l.createdAt && Date.parse(l.createdAt) > since).length;
  }, [listings, sellers, myCity]);

  // Menüdeki favori rozeti: fiyatı düşen favoriler + yeni ilanı olan bildirimli aramalar
  const favNews = useMemo(() => {
    let n = 0;
    for (const [k, was] of Object.entries(favs)) {
      const l = listings.find((x) => String(x.id) === k);
      if (l && was > 0 && l.price < was) n++;
    }
    for (const s of saved) if (s.notify && newCount(s) > 0) n++;
    return n;
  }, [favs, listings, saved, newCount]);

  const value: Ctx = {
    ready, listings, sellers, stats, profile, authReady, myCity, favs, toggleFav, cmp, toggleCmp, removeCmp, clearCmp,
    saved, saveSearch, deleteSaved, setNotify, markSeen, newCount, unread, refreshUnread, favNews, toast, reload,
    reloadProfile: () => loadProfile(profile?.id ?? null, profile?.email ?? ''), find,
  };

  const cmpItems = cmp.map((k) => find(k)).filter((x): x is Listing => !!x);
  return (
    <MarketCtx.Provider value={value}>
      {loadError ? <div className="wrap"><div className="note bad" role="alert">{loadError} <button className="btn ghost sm" type="button" onClick={() => void reload()}>Tekrar dene</button></div></div> : null}
      {children}
      {cmpItems.length > 0 ? (
        <div id="cmpBar" role="region" aria-label="Karşılaştırma">
          <span className="out"><b>{cmpItems.length}</b> / 3 ilan seçildi: {cmpItems.map((l) => cardTitle(l)).join(' · ')}</span>
          {cmpItems.length >= 2 ? <a className="btn sm" href="/karsilastir">Karşılaştır</a> : <span className="sub">En az 2 ilan seç</span>}
          <button className="btn ghost sm" type="button" onClick={clearCmp}>Temizle</button>
        </div>
      ) : null}
      {msg ? <div id="toast" role="status">{msg}</div> : null}
    </MarketCtx.Provider>
  );
}
