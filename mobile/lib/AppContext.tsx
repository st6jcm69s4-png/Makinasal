import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Ctx = {
  session: Session | null;
  ready: boolean;
  favs: Set<string>;
  toggleFav: (listingId: string, price: number | string) => Promise<string | null>; // hata metni ya da null
  reloadFavs: () => Promise<void>;
  netFavs: Set<string>; // "post:<id>" / "firm:<id>"
  toggleNetFav: (kind: 'post' | 'firm', id: string) => Promise<string | null>;
  cmp: string[];
  toggleCmp: (listingId: string) => string | null; // hata metni ya da null
};
const AppCtx = createContext<Ctx>({ session: null, ready: false, favs: new Set(), toggleFav: async () => null, reloadFavs: async () => {}, netFavs: new Set(), toggleNetFav: async () => null, cmp: [], toggleCmp: () => null });
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [netFavs, setNetFavs] = useState<Set<string>>(new Set());
  const [cmp, setCmp] = useState<string[]>([]);
  const uid = session?.user.id;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const reloadFavs = useCallback(async () => {
    if (!uid) { setFavs(new Set()); return; }
    const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', uid);
    setFavs(new Set((data ?? []).map((r: { listing_id: string }) => r.listing_id)));
  }, [uid]);
  useEffect(() => { void reloadFavs(); }, [reloadFavs]);
  useEffect(() => {
    if (!uid) { setNetFavs(new Set()); return; }
    void supabase.from('network_favorites').select('kind,ref_id').eq('user_id', uid).then(({ data }) => {
      setNetFavs(new Set(((data ?? []) as { kind: string; ref_id: string }[]).map((r) => `${r.kind}:${r.ref_id}`)));
    });
  }, [uid]);
  const toggleNetFav = useCallback(async (kind: 'post' | 'firm', id: string) => {
    if (!uid) return 'Favorilere eklemek için giriş yapmalısın.';
    const key = `${kind}:${id}`;
    const had = netFavs.has(key);
    setNetFavs((cur) => { const n = new Set(cur); if (had) n.delete(key); else n.add(key); return n; });
    const { error } = had
      ? await supabase.from('network_favorites').delete().eq('user_id', uid).eq('kind', kind).eq('ref_id', id)
      : await supabase.from('network_favorites').insert({ kind, ref_id: id });
    if (error) {
      setNetFavs((cur) => { const n = new Set(cur); if (had) n.add(key); else n.delete(key); return n; });
      return /300|row-level/i.test(error.message) ? 'En fazla 300 favori kaydedebilirsin.' : 'İşlem kaydedilemedi. Bağlantını kontrol et.';
    }
    return null;
  }, [uid, netFavs]);

  const toggleFav = useCallback(async (listingId: string, price: number | string) => {
    if (!uid) return 'Favorilere eklemek için giriş yapmalısın.';
    const had = favs.has(listingId);
    setFavs((cur) => { const n = new Set(cur); if (had) n.delete(listingId); else n.add(listingId); return n; });
    let error: { message: string } | null;
    if (had) {
      ({ error } = await supabase.from('favorites').delete().eq('user_id', uid).eq('listing_id', listingId));
    } else {
      ({ error } = await supabase.from('favorites').insert({ user_id: uid, listing_id: listingId, price_at_save: Number(price) }));
      if (error && /price_at_save/.test(error.message)) ({ error } = await supabase.from('favorites').insert({ user_id: uid, listing_id: listingId }));
    }
    if (error) { await reloadFavs(); return 'İşlem kaydedilemedi. Bağlantını kontrol et.'; }
    return null;
  }, [uid, favs, reloadFavs]);

  const toggleCmp = useCallback((listingId: string) => {
    if (cmp.includes(listingId)) { setCmp(cmp.filter((x) => x !== listingId)); return null; }
    if (cmp.length >= 3) return 'En fazla 3 ilan karşılaştırabilirsin.';
    setCmp([...cmp, listingId]); return null;
  }, [cmp]);

  const value = useMemo(() => ({ session, ready, favs, toggleFav, reloadFavs, netFavs, toggleNetFav, cmp, toggleCmp }), [session, ready, favs, toggleFav, reloadFavs, netFavs, toggleNetFav, cmp, toggleCmp]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
