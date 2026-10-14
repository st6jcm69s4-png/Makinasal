'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

type Item = { id: string; title: string; other: string; last: string; at: string };

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const fmt = (s: string) => new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export function Inbox() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const me = u.user?.id ?? null;
      setUid(me);
      setReady(true);
      if (!me) return;
      const { data: threads, error: tErr } = await supabase
        .from('threads')
        .select('id,buyer_id,seller_id,created_at,listings(title)')
        .or(`buyer_id.eq.${me},seller_id.eq.${me}`);
      if (tErr) { setError(tErr.message); return; }
      const list = threads ?? [];
      if (list.length === 0) { setItems([]); return; }
      const otherIds = [...new Set(list.map((t) => (t.buyer_id === me ? t.seller_id : t.buyer_id) as string))];
      const [profiles, msgs] = await Promise.all([
        supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', otherIds),
        supabase.from('messages').select('thread_id,body,created_at').in('thread_id', list.map((t) => t.id as string))
          .order('created_at', { ascending: false }).limit(300),
      ]);
      const names = new Map<string, string>();
      for (const p of profiles.data ?? []) names.set(p.id as string, ((p.is_store && p.store_name) || p.full_name || 'Üye') as string);
      const lastBy = new Map<string, { body: string; at: string }>();
      for (const m of msgs.data ?? []) if (!lastBy.has(m.thread_id as string)) lastBy.set(m.thread_id as string, { body: m.body as string, at: m.created_at as string });
      const out: Item[] = list.map((t) => {
        const last = lastBy.get(t.id as string);
        return {
          id: t.id as string,
          title: one(t.listings as { title: string } | { title: string }[] | null)?.title ?? 'İlan',
          other: names.get((t.buyer_id === me ? t.seller_id : t.buyer_id) as string) ?? 'Üye',
          last: last?.body ?? 'Henüz mesaj yok',
          at: last?.at ?? (t.created_at as string),
        };
      });
      out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      setItems(out);
    })();
  }, []);

  if (!ready) return <div className="panel">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok.</div>;
  if (!uid) return <div className="panel">Mesajlarını görmek için <Link href="/giris"><b>giriş yap</b></Link>.</div>;
  if (error) return <div className="alert low" role="alert">{error}</div>;
  if (items === null) return <div className="panel">Yükleniyor…</div>;
  if (items.length === 0) return <div className="panel empty">Henüz konuşman yok. Bir ilanda <b>Satıcıya yaz</b> düğmesine bas.</div>;
  return (
    <div className="panel">
      {items.map((i) => (
        <Link key={i.id} href={`/mesajlar/${i.id}`} className="mylisting">
          <div>
            <b>{i.other}</b> <span className="meta">· {i.title}</span>
            <div className="meta clamp">{i.last}</div>
          </div>
          <span className="meta">{fmt(i.at)}</span>
        </Link>
      ))}
    </div>
  );
}
