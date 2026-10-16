'use client';

import type { QueryResult } from '@/lib/supabase/result';
import { useCallback, useEffect, useState } from 'react';
import { LIMITS } from '@/lib/data/constants';
import { formatTL } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';
import { Pill } from './ui';

type Row = {
  id: string; title: string; brand?: string | null; model?: string | null; category: string; price: number | string; city: string; status: string;
  year: number | null; created_at: string; boosted_until?: string | null; listing_photos: { path: string }[] | null;
};
type Stat = { views: number; phones: number };

const STATUS: Record<string, string> = { active: 'Yayında', paused: 'Duraklatıldı', sold: 'Satıldı' };
const COLS = 'id,title,category,price,city,status,year,created_at,listing_photos(path)';

export function MyListings() {
  const { profile, authReady, reload, toast } = useMarket();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [error, setError] = useState('');

  const load = useCallback(async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    let res: QueryResult = await supabase.from('listings').select(`${COLS},brand,model,boosted_until`).eq('seller_id', uid).neq('status', 'removed').order('created_at', { ascending: false });
    if (res.error) res = await supabase.from('listings').select(COLS).eq('seller_id', uid).neq('status', 'removed').order('created_at', { ascending: false });
    if (res.error) { setError('İlanların yüklenemedi. Lütfen tekrar dene.'); setRows([]); return; }
    const list = res.data as unknown as Row[];
    setRows(list);
    const st = await supabase.from('listing_stats').select('listing_id,views,phones').in('listing_id', list.map((r) => r.id));
    const map: Record<string, Stat> = {};
    for (const s of (st.data ?? []) as unknown as { listing_id: string; views: number; phones: number }[]) map[s.listing_id] = { views: s.views, phones: s.phones };
    setStats(map);
  }, []);

  useEffect(() => { if (profile) void load(profile.id); }, [profile, load]);

  async function patch(id: string, values: Record<string, unknown>, ok?: string) {
    const supabase = getSupabase();
    if (!supabase || !profile) return;
    setError('');
    const { error: err } = await supabase.from('listings').update(values).eq('id', id);
    if (err) setError(err.message); else if (ok) toast(ok);
    await load(profile.id);
    void reload();
  }

  async function remove(row: Row) {
    const supabase = getSupabase();
    if (!supabase || !profile) return;
    if (!window.confirm(`"${row.title}" ilanı kaldırılsın mı? İşlem ve değerlendirme geçmişi korunur.`)) return;
    setError('');
    const { data, error: err } = await supabase.from('listings').update({ status: 'removed' }).eq('id', row.id).eq('seller_id', profile.id).select('id').maybeSingle();
    if (err || !data) { setError('İlan kaldırılamadı. Tekrar dene.'); return; }
    toast('İlan kaldırıldı. İşlem geçmişin korunuyor.');
    await load(profile.id);
    void reload();
  }

  if (!authReady) return <div className="panel">Yükleniyor…</div>;
  if (!profile) return <div className="panel">İlanlarını görmek için <a className="linkbtn" href="/giris">giriş yap</a>.</div>;
  const limit = profile.is_premium ? LIMITS.prem.listings : LIMITS.free.listings;
  const live = (rows ?? []).filter((r) => r.status === 'active' || r.status === 'paused').length;
  return (
    <>
      <p className="sub">{live} / {limit} ilan hakkı kullanıldı ({profile.is_premium ? 'premium' : 'ücretsiz'} üyelik). Yayında ve duraklatılmış ilanlar hakkı kullanır; satılan ve silinen ilanlar hakkı geri açar.</p>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {rows === null ? <div className="panel">Yükleniyor…</div> : rows.length === 0 ? (
        <div className="empty">Henüz ilanın yok. <a className="linkbtn" href="/ilan-ver">İlk ilanını ver</a></div>
      ) : rows.map((r) => {
        const boosted = !!r.boosted_until && Date.parse(r.boosted_until) > Date.now();
        return (
          <div key={r.id} className="mine">
            <div style={{ minWidth: 0 }}>
              <a href={`/ilanlar/${r.id}`}><b>{r.title}</b></a>{r.year ? ` · ${r.year}` : ''}
              <br /><span className="sub">{formatTL(Number(r.price))} · {r.city} · {r.listing_photos?.length ?? 0} fotoğraf{profile.is_premium && stats[r.id] ? ` · ${stats[r.id].views} görüntülenme, ${stats[r.id].phones} telefon` : ''}</span>
              <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                <Pill cls={r.status === 'active' ? 'good' : r.status === 'sold' ? '' : 'warn'}>{STATUS[r.status] ?? r.status}</Pill>
                {boosted || profile.is_premium ? <Pill cls="prem">Öne çıkan</Pill> : null}
              </div>
            </div>
            <div className="acts-row">
              {r.status !== 'sold' ? <a className="btn ghost sm" href={`/ilan-ver?duzenle=${r.id}`}>Düzenle</a> : null}
              {r.status === 'active' ? <button className="btn ghost sm" type="button" onClick={() => void patch(r.id, { confirmed_at: new Date().toISOString() }, 'İlanın “hâlâ satılık” olarak doğrulandı.')}>Hâlâ satılık</button> : null}
              {r.status !== 'sold' ? <button className="btn ghost sm" type="button" onClick={() => void patch(r.id, { price: Math.round((Number(r.price) * 0.95) / 100) * 100 }, 'Fiyat %5 düşürüldü.')}>Fiyatı %5 düşür</button> : null}
              {r.status === 'active' ? <button className="btn ghost sm" type="button" onClick={() => void patch(r.id, { status: 'paused' })}>Duraklat</button> : null}
              {r.status === 'paused' ? <button className="btn ghost sm" type="button" onClick={() => void patch(r.id, { status: 'active' })}>Yayına al</button> : null}
              {r.status !== 'sold' ? <button className="btn ghost sm" type="button" onClick={() => void patch(r.id, { status: 'sold' })}>Satıldı</button> : null}
              {r.status !== 'sold' && !profile.is_premium ? <button className="btn ghost sm" type="button" disabled title="Ödeme açılınca">Öne çıkar (yakında)</button> : null}
              <button className="btn ghost sm" type="button" onClick={() => void remove(r)}>İlanı kaldır</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
