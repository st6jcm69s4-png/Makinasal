'use client';
import { useLanguage } from "@/components/LanguageProvider";


import { useCallback, useEffect, useState } from 'react';
import { TAG_OPTIONS } from '@/lib/market';
import { getSupabase } from '@/lib/supabase/client';

type Deal = { buyer_confirmed: boolean; seller_confirmed: boolean; completed_at: string | null };
type Review = { score: number; comment: string | null; tags?: string[] };

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Karşılıklı onaylı satış + puanlama. Puan yalnızca iki taraf da onayladıktan sonra verilebilir. */
export function DealBox({ threadId, me, buyerId, sellerId }: { threadId: string; me: string; buyerId: string; sellerId: string }) {
  const { t: tr, language } = useLanguage();

  const iAmBuyer = me === buyerId;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: d } = await supabase
      .from('deals').select('buyer_confirmed,seller_confirmed,completed_at').eq('thread_id', threadId).maybeSingle();
    setDeal((d as Deal | null) ?? null);
    let rr = await supabase
      .from('reviews').select('score,comment,tags').eq('thread_id', threadId).eq('reviewer_id', me).maybeSingle();
    if (rr.error) rr = await supabase.from('reviews').select('score,comment').eq('thread_id', threadId).eq('reviewer_id', me).maybeSingle();
    const r = rr.data;
    setReview((r as Review | null) ?? null);
    setLoaded(true);
  }, [threadId, me]);

  useEffect(() => {
    void load();
    const id = setInterval(() => { if (!document.hidden) void load(); }, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function confirmDeal() {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!window.confirm(tr("Satışın gerçekleştiğini onaylıyor musun? Bu işlem geri alınamaz."))) return;
    setBusy(true);
    setError('');
    const mine = iAmBuyer ? 'buyer_confirmed' : 'seller_confirmed';
    const res = deal
      ? await supabase.from('deals').update({ [mine]: true }).eq('thread_id', threadId)
      : await supabase.from('deals').insert({ thread_id: threadId, buyer_confirmed: iAmBuyer, seller_confirmed: !iAmBuyer });
    if (res.error) setError(res.error.message);
    await load();
    setBusy(false);
  }

  async function submitReview() {
    const supabase = getSupabase();
    if (!supabase || score < 1) { setError("Önce yıldız seç."); return; }
    setBusy(true);
    setError('');
    const row = {
      thread_id: threadId,
      reviewer_id: me,
      reviewee_id: iAmBuyer ? sellerId : buyerId,
      role: iAmBuyer ? 'seller' : 'buyer',
      score,
      comment: comment.trim() || null,
    };
    let { error: err } = await supabase.from('reviews').insert({ ...row, tags });
    if (err && /tags/.test(err.message)) ({ error: err } = await supabase.from('reviews').insert(row));
    if (err) setError(err.message);
    await load();
    setBusy(false);
  }

  if (!loaded) return null;
  const myOk = !!deal && (iAmBuyer ? deal.buyer_confirmed : deal.seller_confirmed);
  const otherOk = !!deal && (iAmBuyer ? deal.seller_confirmed : deal.buyer_confirmed);
  const done = !!deal && deal.buyer_confirmed && deal.seller_confirmed;

  return (
    <div className="dealbox">
      {!done && !myOk ? (
        <>
          <b>{otherOk ? tr("Karşı taraf satışı onayladı.") : tr("Satış gerçekleşti mi?")}</b>
          <p className="sub">{tr("İki taraf da onaylayınca birbirinizi puanlayabilirsiniz. Ürünü teslim aldıktan / ödemeyi aldıktan sonra onayla.")}</p>
          <button className="btn" type="button" onClick={confirmDeal} disabled={busy}>{tr("Satış gerçekleşti")}</button>
        </>
      ) : null}
      {!done && myOk ? <b>{tr("Onayın alındı. Karşı tarafın onayı bekleniyor…")}</b> : null}
      {done && review ? (
        <>
          <b>{tr("Satış tamamlandı.")}</b>
          <p className="sub">{tr("İlan otomatik olarak “satıldı” işaretlendi.")}</p>
          <p className="sub">{tr("Verdiğin puan: ")}<span>{stars(review.score)}</span>{review.comment ? ` — “${review.comment}”` : ''}{review.tags && review.tags.length ? ` · ${review.tags.join(', ')}` : ''}</p>
        </>
      ) : null}
      {done && !review ? (
        <>
          <b>{tr("Satış tamamlandı. Karşı tarafı puanla:")}</b>
          <p className="sub">{tr("İlan otomatik olarak “satıldı” işaretlendi.")}</p>
          <div className="stars" role="radiogroup" aria-label={tr("Puan")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={score === n} aria-label={tr("{0} yıldız", {"0":n})}
                className="star" aria-pressed={n <= score} onClick={() => setScore(n)}>★</button>
            ))}
          </div>
          <div className="chips" style={{ marginBottom: 8 }}>
            {TAG_OPTIONS.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tags.includes(t)}
                onClick={() => setTags((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>{t}</button>
            ))}
          </div>
          <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tr("Yorum (isteğe bağlı)")} />
          <p><button className="btn" type="button" onClick={submitReview} disabled={busy || score < 1}>{tr("Puanı gönder")}</button></p>
        </>
      ) : null}
      {error ? <div className="err" role="alert">{tr(error)}</div> : null}
    </div>
  );
}
