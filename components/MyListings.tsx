'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatTL } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';

type Row = {
  id: string; title: string; category: string; price: number | string; city: string; status: string;
  created_at: string; listing_photos: { path: string }[] | null;
};

const STATUS: Record<string, string> = { active: 'Yayında', paused: 'Duraklatıldı', sold: 'Satıldı' };

export function MyListings() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('listings')
      .select('id,title,category,price,city,status,created_at,listing_photos(path)')
      .eq('seller_id', uid)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows(data as unknown as Row[]);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setReady(true);
      if (uid) void load(uid);
    });
  }, [load]);

  async function setStatus(id: string, status: string) {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    setError('');
    const { error } = await supabase.from('listings').update({ status }).eq('id', id);
    if (error) setError(error.message);
    await load(userId);
  }

  async function remove(row: Row) {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    if (!window.confirm(`"${row.title}" ilanı kalıcı olarak silinsin mi?`)) return;
    setError('');
    const paths = (row.listing_photos ?? []).map((p) => p.path);
    if (paths.length > 0) await supabase.storage.from('listing-photos').remove(paths);
    const { error } = await supabase.from('listings').delete().eq('id', row.id);
    if (error) setError(error.message);
    await load(userId);
  }

  if (!ready) return <div className="panel">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok.</div>;
  if (!userId) return <div className="panel">İlanlarını görmek için <Link href="/giris"><b>giriş yap</b></Link>.</div>;

  const live = (rows ?? []).filter((r) => r.status === 'active' || r.status === 'paused').length;
  return (
    <>
      <p className="sub">{live} / 3 ilan hakkı kullanıldı (ücretsiz üyelik). Satılan ilanlar hakkı geri açar.</p>
      {error ? <div className="alert low" role="alert">{error}</div> : null}
      {rows === null ? <div className="panel">Yükleniyor…</div> : rows.length === 0 ? (
        <div className="panel empty">Henüz ilanın yok. <Link href="/ilan-ver"><b>İlk ilanını ver</b></Link></div>
      ) : (
        <div className="panel">
          {rows.map((r) => (
            <div key={r.id} className="mylisting">
              <div>
                <Link href={`/ilanlar/${r.id}`}><b>{r.title}</b></Link>
                <div className="meta">{r.category} · {r.city} · {formatTL(Number(r.price))} · {r.listing_photos?.length ?? 0} fotoğraf</div>
              </div>
              <div className="actions">
                <span className={`badge ${r.status === 'active' ? 'good' : r.status === 'sold' ? '' : 'warn'}`}>{STATUS[r.status] ?? r.status}</span>
                {r.status === 'active' ? <button className="btn ghost" onClick={() => setStatus(r.id, 'paused')}>Duraklat</button> : null}
                {r.status === 'paused' ? <button className="btn ghost" onClick={() => setStatus(r.id, 'active')}>Yayına al</button> : null}
                {r.status !== 'sold' ? <button className="btn ghost" onClick={() => setStatus(r.id, 'sold')}>Satıldı</button> : null}
                <button className="btn ghost" onClick={() => remove(r)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
