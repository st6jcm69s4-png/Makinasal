'use client';
import { useLanguage } from "@/components/LanguageProvider";


import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MESSAGE_PAGE_SIZE, mergeMessages, olderMessagesFilter } from '@/lib/messages';
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
const fmt = (s: string, language: 'tr'|'en') => new Date(s).toLocaleString(language === 'en' ? 'en-GB' : 'tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export function MessagesView({ activeId }: { activeId?: string }) {
  const { t: tr, language } = useLanguage();

  const { profile, authReady, refreshUnread } = useMarket();
  const me = profile?.id ?? null;
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const currentMessages = useRef(msgs); currentMessages.current = msgs;
  const [trust, setTrust] = useState<Trust | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const currentScope = useRef('');
  currentScope.current = `${me ?? ''}:${activeId ?? ''}`;
  const currentMe = useRef(me); currentMe.current = me;
  const conversation = useRef<HTMLDivElement | null>(null);
  const initialMessages = useRef(true);
  const messageRequests = useRef(new Set<string>());
  const threadsRequest = useRef(new Set<string>());
  const [threadError, setThreadError] = useState('');
  const [sendError, setSendError] = useState('');
  const pendingSend = useRef<{ scope: string; body: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !me) return;
    if (threadsRequest.current.has(me)) return;
    threadsRequest.current.add(me);
    try {
    const { data: ts, error: tErr } = await supabase.from('threads').select('id,listing_id,buyer_id,seller_id,created_at,listings(title)').or(`buyer_id.eq.${me},seller_id.eq.${me}`);
    if (currentMe.current !== me) return;
    if (tErr) throw tErr;
    setThreadError('');
    const list = ts ?? [];
    if (list.length === 0) { setThreads([]); return; }
    const otherIds = [...new Set(list.map((t) => (t.buyer_id === me ? t.seller_id : t.buyer_id) as string))];
    const [profiles, last, unread] = await Promise.all([
      supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', otherIds),
      supabase.rpc('latest_thread_messages', { p_threads: list.map(t => t.id as string) }),
      supabase.rpc('unread_counts'),
    ]);
    if (currentMe.current !== me) return;
    if (profiles.error || last.error || unread.error) throw new Error('Konuşma bilgileri yüklenemedi');
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
    } catch { if (currentMe.current === me) { setThreadError('Konuşmalar yüklenemedi. Lütfen tekrar dene.'); setThreads(current => current ?? []); } }
    finally { threadsRequest.current.delete(me); }
  }, [me]);

  const loadMsgs = useCallback(async (older?: Msg) => {
    const supabase = getSupabase();
    if (!supabase || !activeId || !me) return;
    const scope = `${me}:${activeId}`;
    const requestKey = scope + (older ? ':older' : ':latest');
    if (messageRequests.current.has(requestKey)) return;
    messageRequests.current.add(requestKey);
    if (older) setOlderLoading(true);
    else if (initialMessages.current) setMessagesLoading(true);
    try {
      const build = (columns: string) => {
        let query = supabase.from('messages').select(columns).eq('thread_id', activeId)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
        if (older) query = query.or(olderMessagesFilter(older));
        return query;
      };
      let res = await build('id,sender_id,body,created_at,kind,offer_amount');
      if (res.error?.code === '42703' || res.error?.code === 'PGRST204') res = await build('id,sender_id,body,created_at');
      if (res.error) throw res.error;
      if (currentScope.current !== scope) return;
      const rows = (res.data ?? []) as unknown as Msg[];
      const first = initialMessages.current;
      if (older || first) setHasOlder(rows.length > MESSAGE_PAGE_SIZE);
      const scroller = conversation.current;
      const previousHeight = scroller?.scrollHeight ?? 0;
      const previousTop = scroller?.scrollTop ?? 0;
      const atBottom = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100;
      const page = rows.slice(0, MESSAGE_PAGE_SIZE);
      // Recover after >50 messages arrive while disconnected without leaving a hidden gap.
      const gap = !older && page.length === MESSAGE_PAGE_SIZE && currentMessages.current.length > 0 && !page.some(row => currentMessages.current.some(old => old.id === row.id));
      if (gap) setHasOlder(true);
      setMsgs(current => mergeMessages(first || gap ? [] : current, page));
      initialMessages.current = false;
      setError('');
      requestAnimationFrame(() => {
        if (currentScope.current !== scope) return;
        if (older && scroller) scroller.scrollTop = previousTop + scroller.scrollHeight - previousHeight;
        else if (first || atBottom) bottom.current?.scrollIntoView({ block: 'nearest' });
      });
      if (!older && !document.hidden) { await supabase.rpc('mark_thread_read', { p_thread: activeId }); if (currentScope.current === scope) void refreshUnread(); }
    } catch { if (currentScope.current === scope) setError("Mesajlar yüklenemedi. Bağlantını kontrol edip tekrar dene."); }
    finally {
      messageRequests.current.delete(requestKey);
      if (currentScope.current === scope) { setMessagesLoading(false); setOlderLoading(false); }
    }
  }, [activeId, me, refreshUnread]);

  useEffect(() => { setThreads(null); setMsgs([]); setText(''); setError(''); setThreadError(''); setSendError(''); if (me) void loadThreads(); }, [loadThreads, me]);
  useEffect(() => { setMsgs([]); setTrust(null); setText(''); setBusy(false); setError(''); setSendError(''); setMessagesLoading(false); setOlderLoading(false); setHasOlder(false); initialMessages.current = true; if (activeId && me) void loadMsgs(); }, [activeId, me, loadMsgs]);
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => { if (!document.hidden) { void loadThreads(); if (activeId) void loadMsgs(); } }, 5000);
    return () => clearInterval(id);
  }, [me, activeId, loadThreads, loadMsgs]);

  const active = threads?.find((t) => t.id === activeId) ?? null;
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !active) return;
    let live = true;
    supabase.from('user_stats').select('score,review_count,deals,reports').eq('id', active.otherId).maybeSingle().then(({ data: st }) => {
      if (!live) return;
      setTrust({ rep: Number(st?.reports ?? 0), deals: Number(st?.deals ?? 0), s: st && Number(st.review_count) > 0 ? Number(st.score) : null });
    });
    return () => { live = false; };
  }, [active?.otherId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    const body = text.trim();
    if (!supabase || !me || !activeId || !body || busy) return;
    setSendError('');
    const check = checkMessage(body);
    if (check.block) { setSendError(check.block); return; }
    if (check.warn && !window.confirm(tr("Dikkat: Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermek dolandırıcılık riski taşır. Yine de göndermek istiyor musun?"))) return;
    const scope = currentScope.current;
    if (pendingSend.current?.scope !== scope || pendingSend.current.body !== body) pendingSend.current = { scope, body, id: crypto.randomUUID() };
    const messageId = pendingSend.current.id;
    setBusy(true);
    try {
      const { error: err } = await supabase.from('messages').insert({ id: messageId, thread_id: activeId, sender_id: me, body });
      if (currentScope.current !== scope) return;
      if (err && err.code !== '23505') { setSendError(err.message.includes('MESSAGE_PROFANITY') ? 'Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.' : 'Mesaj gönderilemedi. Yazdığın mesaj korunuyor; tekrar deneyebilirsin.'); return; }
      if (pendingSend.current?.id === messageId) pendingSend.current = null;
      setText(current => current.trim() === body ? '' : current);
      await loadMsgs();
      void loadThreads();
    } catch { if (currentScope.current === scope) setSendError('Mesaj gönderilemedi. Bağlantını kontrol et; yazdığın mesaj korunuyor.'); }
    finally { if (currentScope.current === scope) setBusy(false); }
  }

  if (!authReady) return <div className="empty">{tr("Yükleniyor…")}</div>;
  if (!getSupabase()) return <div className="panel">{tr("Supabase bağlantısı yok.")}</div>;
  if (!me) return <><h1>{tr("Mesajlar")}</h1><div className="panel" style={{ marginTop: 16 }}>{tr("Mesajlarını görmek için ")}<a className="linkbtn" href="/giris">{tr("giriş yap")}</a>.</div></>;

  return (
    <>
      <h1>{tr("Mesajlar")}</h1>
      <p className="lead">{tr("Yazışmalar, teklifler ve satış onayı burada. Mesajlarda IBAN ve harici link paylaşımı engellenir.")}</p>
      {threadError ? <div className="err" role="alert">{tr(threadError)} <button className="btn ghost sm" onClick={() => void loadThreads()}>{tr("Tekrar dene")}</button></div> : null}
      <div className={`msgs${activeId ? ' show-conv' : ''}`}>
        <div className="panel thr-list" style={{ padding: 0 }}>
          {threads === null ? <div className="empty">{tr("Yükleniyor…")}</div> : threads.length === 0 && !threadError ? (
            <div className="empty">{tr("Henüz konuşman yok. Bir ilanda ")}<b>{tr("Mesaj gönder")}</b> {tr(" düğmesine bas.")}</div>
          ) : threads.map((t) => (
            <a key={t.id} href={`/mesajlar/${t.id}`} className="thr" aria-current={t.id === activeId ? 'true' : undefined}>
              <b>{t.other}{t.unread > 0 ? <span className="udot" aria-label={tr("{0} okunmamış", {"0":t.unread})} /> : null}</b>
              <span className="sub">{t.title}</span>
              <div className="sub clamp">{t.last}</div>
              <div className="sub">{fmt(t.at, language)}</div>
            </a>
          ))}
        </div>
        <div className="panel thr-conv">
          {!activeId ? <div className="empty">{tr("Soldan bir konuşma seç.")}</div> : !active ? (
            threads === null ? <div className="empty">{tr("Yükleniyor…")}</div> : <div className="empty">{tr("Bu konuşma bulunamadı. ")}<a className="linkbtn" href="/mesajlar">{tr("Mesajlara dön")}</a></div>
          ) : (
            <>
              <div className="sh-head">
                <div>
                  <b>{active.other}</b> {trust ? <TrustPill seller={trust} /> : null}
                  <div className="sub"><a className="linkbtn" href={`/ilanlar/${active.listingId}`}>{active.title}</a></div>
                </div>
                <a className="btn ghost sm thr-back" href="/mesajlar">{tr("← Tüm mesajlar")}</a>
              </div>
              <div className="note" style={{ margin: '10px 0' }}>{tr("Ürünü görmeden kapora veya ön ödeme gönderme. IBAN ve harici link paylaşımı engellenir.")}</div>
              <DealBox threadId={active.id} me={me} buyerId={active.buyerId} sellerId={active.sellerId} />
              <div className="conv-msgs" ref={conversation} aria-live="polite" aria-busy={messagesLoading || olderLoading}>
                {hasOlder && <button className="btn ghost sm" disabled={olderLoading} onClick={() => void loadMsgs(msgs[0])}>{olderLoading ? tr("Eski mesajlar yükleniyor…") : tr("Önceki mesajları yükle")}</button>}
                {messagesLoading && <p role="status">{tr("Mesajlar yükleniyor…")}</p>}
                {!messagesLoading && !error && msgs.length === 0 ? <p className="sub">{tr("Henüz mesaj yok. İlk mesajı sen yaz.")}</p> : null}
                {msgs.map((m) => (
                  <div key={m.id} className={`bub${m.sender_id === me ? ' me' : ''}${m.kind === 'offer' ? ' offer' : ''}${KAPORA_RE.test(m.body) ? ' warnb' : ''}`}>
                    {m.kind === 'offer' && m.offer_amount != null ? <b>{tr("Teklif: ")}{formatTL(Number(m.offer_amount), language)}<br /></b> : null}
                    {m.body}
                    <span className="tm">{fmt(m.created_at, language)}</span>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              {error ? <div className="err" role="alert">{tr(error)} <button className="btn ghost sm" onClick={() => void loadMsgs()}>{tr("Tekrar dene")}</button></div> : null}
              {sendError && <div className="err" role="alert">{tr(sendError)}</div>}
              <form className="searchbar" style={{ marginTop: 10 }} onSubmit={send}>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={tr("Mesajını yaz…")} aria-label={tr("Mesaj")} />
                <button className="btn" type="submit" disabled={busy || !text.trim()}>{tr("Gönder")}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
