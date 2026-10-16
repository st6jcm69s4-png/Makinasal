'use client';

import type { QueryResult } from '@/lib/supabase/result';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatTL } from '@/lib/format';
import { checkMessage, KAPORA_RE } from '@/lib/messageFilter';
import { getSupabase } from '@/lib/supabase/client';
import { DealBox } from './DealBox';
import { useMarket } from './MarketProvider';
import { TrustPill } from './ui';

type Thread = { id: string; listingId: string; title: string; buyerId: string; sellerId: string; otherId: string; other: string; last: string; at: string; unread: number };
type Msg = { id: string; sender_id: string; body: string; created_at: string; kind?: string; offer_amount?: number | string | null };
type Trust = { rep: number; deals: number; s: number | null };

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const fmt = (s: string) => new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export function MessagesView({ activeId }: { activeId?: string }) {
  const { profile, authReady, refreshUnread } = useMarket();
  const me = profile?.id ?? null;
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [trust, setTrust] = useState<Trust | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !me) return;
    const { data: ts, error: tErr } = await supabase.from('threads').select('id,listing_id,buyer_id,seller_id,created_at,listings(title)').or(`buyer_id.eq.${me},seller_id.eq.${me}`);
    if (tErr) { setError('Konuşmalar yüklenemedi. Lütfen tekrar dene.'); setThreads([]); return; }
    const list = ts ?? [];
    if (list.length === 0) { setThreads([]); return; }
    const otherIds = [...new Set(list.map((t) => (t.buyer_id === me ? t.seller_id : t.buyer_id) as string))];
    const [profiles, last, unread] = await Promise.all([
      supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', otherIds),
      supabase.from('messages').select('thread_id,body,created_at').in('thread_id', list.map((t) => t.id as string)).order('created_at', { ascending: false }).limit(300),
      supabase.rpc('unread_counts'),
    ]);
    const names = new Map<string, string>();
    for (const p of profiles.data ?? []) names.set(p.id as string, ((p.is_store && p.store_name) || p.full_name || 'Üye') as string);
    const lastBy = new Map<string, { body: string; at: string }>();
    for (const m of last.data ?? []) if (!lastBy.has(m.thread_id as string)) lastBy.set(m.thread_id as string, { body: m.body as string, at: m.created_at as string });
    const un = new Map<string, number>();
    for (const r of (unread.data ?? []) as { thread_id: string; n: number | string }[]) un.set(r.thread_id, Number(r.n));
    const out: Thread[] = list.map((t) => {
      const l = lastBy.get(t.id as string);
      const otherId = (t.buyer_id === me ? t.seller_id : t.buyer_id) as string;
      return {
        id: t.id as string, listingId: t.listing_id as string,
        title: one(t.listings as { title: string } | { title: string }[] | null)?.title ?? 'İlan',
        buyerId: t.buyer_id as string, sellerId: t.seller_id as string, otherId, other: names.get(otherId) ?? 'Üye',
        last: l?.body ?? 'Henüz mesaj yok', at: l?.at ?? (t.created_at as string), unread: un.get(t.id as string) ?? 0,
      };
    });
    out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    setThreads(out);
  }, [me]);

  const loadMsgs = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !activeId) return;
    let res: QueryResult = await supabase.from('messages').select('id,sender_id,body,created_at,kind,offer_amount').eq('thread_id', activeId).order('created_at', { ascending: true });
    if (res.error) res = await supabase.from('messages').select('id,sender_id,body,created_at').eq('thread_id', activeId).order('created_at', { ascending: true });
    if (res.error) { setError('Mesajlar yüklenemedi. Lütfen tekrar dene.'); return; }
    if (res.data) setMsgs(res.data as Msg[]);
    await supabase.rpc('mark_thread_read', { p_thread: activeId });
    void refreshUnread();
  }, [activeId, refreshUnread]);

  useEffect(() => { setThreads(null); setMsgs([]); setText(''); setError(''); if (me) void loadThreads(); }, [loadThreads, me]);
  useEffect(() => { setMsgs([]); setTrust(null); setError(''); if (activeId && me) void loadMsgs(); }, [activeId, me, loadMsgs]);
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => { if (!document.hidden) { void loadThreads(); if (activeId) void loadMsgs(); } }, 5000);
    return () => clearInterval(id);
  }, [me, activeId, loadThreads, loadMsgs]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const active = threads?.find((t) => t.id === activeId) ?? null;
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !active) return;
    supabase.from('user_stats').select('score,review_count,deals,reports').eq('id', active.otherId).maybeSingle().then(({ data: st }) => {
      setTrust({ rep: Number(st?.reports ?? 0), deals: Number(st?.deals ?? 0), s: st && Number(st.review_count) > 0 ? Number(st.score) : null });
    });
  }, [active?.otherId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    const body = text.trim();
    if (!supabase || !me || !activeId || !body) return;
    setError('');
    const check = checkMessage(body);
    if (check.block) { setError(check.block); return; }
    if (check.warn && !window.confirm('Dikkat: Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermek dolandırıcılık riski taşır. Yine de göndermek istiyor musun?')) return;
    setBusy(true);
    const { error: err } = await supabase.from('messages').insert({ thread_id: activeId, sender_id: me, body });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setText('');
    await loadMsgs();
    void loadThreads();
  }

  if (!authReady) return <div className="empty">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok.</div>;
  if (!me) return <><h1>Mesajlar</h1><div className="panel" style={{ marginTop: 16 }}>Mesajlarını görmek için <Link className="linkbtn" href="/giris">giriş yap</Link>.</div></>;

  return (
    <>
      <h1>Mesajlar</h1>
      <p className="lead">Yazışmalar, teklifler ve satış onayı burada. Mesajlarda IBAN ve harici link paylaşımı engellenir.</p>
      {error && !activeId ? <div className="err" role="alert">{error}</div> : null}
      <div className={`msgs${activeId ? ' show-conv' : ''}`}>
        <div className="panel thr-list" style={{ padding: 0 }}>
          {threads === null ? <div className="empty">Yükleniyor…</div> : threads.length === 0 ? (
            <div className="empty">Henüz konuşman yok. Bir ilanda <b>Mesaj gönder</b> düğmesine bas.</div>
          ) : threads.map((t) => (
            <Link key={t.id} href={`/mesajlar/${t.id}`} className="thr" aria-current={t.id === activeId ? 'true' : undefined}>
              <b>{t.other}{t.unread > 0 ? <span className="udot" aria-label={`${t.unread} okunmamış`} /> : null}</b>
              <span className="sub">{t.title}</span>
              <div className="sub clamp">{t.last}</div>
              <div className="sub">{fmt(t.at)}</div>
            </Link>
          ))}
        </div>
        <div className="panel thr-conv">
          {!activeId ? <div className="empty">Soldan bir konuşma seç.</div> : !active ? (
            threads === null ? <div className="empty">Yükleniyor…</div> : <div className="empty">Bu konuşma bulunamadı. <Link className="linkbtn" href="/mesajlar">Mesajlara dön</Link></div>
          ) : (
            <>
              <div className="sh-head">
                <div>
                  <b>{active.other}</b> {trust ? <TrustPill seller={trust} /> : null}
                  <div className="sub"><Link className="linkbtn" href={`/ilanlar/${active.listingId}`}>{active.title}</Link></div>
                </div>
                <Link className="btn ghost sm thr-back" href="/mesajlar">← Tüm mesajlar</Link>
              </div>
              <div className="note" style={{ margin: '10px 0' }}>Ürünü görmeden kapora veya ön ödeme gönderme. IBAN ve harici link paylaşımı engellenir.</div>
              <DealBox threadId={active.id} me={me} buyerId={active.buyerId} sellerId={active.sellerId} />
              <div className="conv-msgs" aria-live="polite">
                {msgs.length === 0 ? <p className="sub">Henüz mesaj yok. İlk mesajı sen yaz.</p> : null}
                {msgs.map((m) => (
                  <div key={m.id} className={`bub${m.sender_id === me ? ' me' : ''}${m.kind === 'offer' ? ' offer' : ''}${KAPORA_RE.test(m.body) ? ' warnb' : ''}`}>
                    {m.kind === 'offer' && m.offer_amount != null ? <b>Teklif: {formatTL(Number(m.offer_amount))}<br /></b> : null}
                    {m.body}
                    <span className="tm">{fmt(m.created_at)}</span>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              {error ? <div className="err" role="alert">{error}</div> : null}
              <form className="searchbar" style={{ marginTop: 10 }} onSubmit={send}>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Mesajını yaz…" aria-label="Mesaj" />
                <button className="btn" type="submit" disabled={busy || !text.trim()}>Gönder</button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
