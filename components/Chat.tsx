'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { checkMessage } from '@/lib/messageFilter';
import { getSupabase } from '@/lib/supabase/client';

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Info = { listingId: string; title: string; other: string };

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const fmt = (s: string) => new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export function Chat({ threadId }: { threadId: string }) {
  const [me, setMe] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('messages').select('id,sender_id,body,created_at').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (data) setMsgs(data as Msg[]);
  }, [threadId]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setMe(uid);
      setReady(true);
      if (!uid) return;
      const { data: t } = await supabase
        .from('threads').select('id,listing_id,buyer_id,seller_id,listings(title)').eq('id', threadId).maybeSingle();
      if (!t) { setMissing(true); return; }
      const otherId = (t.buyer_id === uid ? t.seller_id : t.buyer_id) as string;
      const { data: p } = await supabase.from('profiles').select('full_name,store_name,is_store').eq('id', otherId).maybeSingle();
      setInfo({
        listingId: t.listing_id as string,
        title: one(t.listings as { title: string } | { title: string }[] | null)?.title ?? 'İlan',
        other: (p?.is_store && p.store_name) || p?.full_name || 'Üye',
      });
      await loadMessages();
    })();
  }, [threadId, loadMessages]);

  // Yeni mesajları birkaç saniyede bir kontrol et (sekme açıkken)
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => { if (!document.hidden) void loadMessages(); }, 4000);
    return () => clearInterval(id);
  }, [me, loadMessages]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    const body = text.trim();
    if (!supabase || !me || !body) return;
    setError('');
    const check = checkMessage(body);
    if (check.block) { setError(check.block); return; }
    if (check.warn && !window.confirm('Dikkat: Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermek dolandırıcılık riski taşır. Yine de göndermek istiyor musun?')) return;
    setBusy(true);
    const { error: err } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: me, body });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setText('');
    await loadMessages();
  }

  if (!ready) return <div className="panel">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok.</div>;
  if (!me) return <div className="panel">Mesajlaşmak için <Link href="/giris"><b>giriş yap</b></Link>.</div>;
  if (missing) return <div className="panel empty">Bu konuşma bulunamadı. <Link href="/mesajlar"><b>Mesajlara dön</b></Link></div>;

  return (
    <div className="panel chat">
      <div className="chathead">
        <div>
          <b>{info?.other ?? '…'}</b>
          <div className="meta">{info ? <Link href={`/ilanlar/${info.listingId}`}>{info.title}</Link> : null}</div>
        </div>
        <Link className="btn ghost" href="/mesajlar">Tüm mesajlar</Link>
      </div>
      <div className="alert high">Ürünü görmeden kapora veya ön ödeme gönderme. IBAN ve harici link paylaşımı engellenir.</div>
      <div className="msgs" aria-live="polite">
        {msgs.length === 0 ? <p className="meta">Henüz mesaj yok. İlk mesajı sen yaz.</p> : null}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === me ? 'me' : 'them'}`}>
            <div>{m.body}</div>
            <div className="meta">{fmt(m.created_at)}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error ? <div className="alert low" role="alert">{error}</div> : null}
      <form className="msgform" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Mesajını yaz…" aria-label="Mesaj" />
        <button className="btn" type="submit" disabled={busy || !text.trim()}>Gönder</button>
      </form>
    </div>
  );
}
