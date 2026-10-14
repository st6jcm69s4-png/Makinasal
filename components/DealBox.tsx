'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

type Deal = { buyer_confirmed: boolean; seller_confirmed: boolean; completed_at: string | null };
type Review = { score: number; comment: string | null };

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Karşılıklı onaylı satış + puanlama. Puan yalnızca iki taraf da onayladıktan sonra verilebilir. */
export function DealBox({ threadId, me, buyerId, sellerId }: { threadId: string; me: string; buyerId: string; sellerId: string }) {
  const iAmBuyer = me === buyerId;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: d } = await supabase
      .from('deals').select('buyer_confirmed,seller_confirmed,completed_at').eq('thread_id', threadId).maybeSingle();
    setDeal((d as Deal | null) ?? null);
    const { data: r } = await supabase
      .from('reviews').select('score,comment').eq('thread_id', threadId).eq('reviewer_id', me).maybeSingle();
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
    if (!window.confirm('Satışın gerçekleştiğini onaylıyor musun? Bu işlem geri alınamaz.')) return;
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
    if (!supabase || score < 1) { setError('Önce yıldız seç.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('reviews').insert({
      thread_id: threadId,
      reviewer_id: me,
      reviewee_id: iAmBuyer ? sellerId : buyerId,
      role: iAmBuyer ? 'seller' : 'buyer',
      score,
      comment: comment.trim() || null,
    });
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
          <b>{otherOk ? 'Karşı taraf satışı onayladı.' : 'Satış gerçekleşti mi?'}</b>
          <p className="meta">İki taraf da onaylayınca birbirinizi puanlayabilirsiniz. Ürünü teslim aldıktan / ödemeyi aldıktan sonra onayla.</p>
          <button className="btn" type="button" onClick={confirmDeal} disabled={busy}>Satış gerçekleşti</button>
        </>
      ) : null}
      {!done && myOk ? <b>Onayın alındı. Karşı tarafın onayı bekleniyor…</b> : null}
      {done && review ? (
        <>
          <b>Satış tamamlandı.</b>
          <p className="meta">Verdiğin puan: <span className="stars">{stars(review.score)}</span>{review.comment ? ` — “${review.comment}”` : ''}</p>
        </>
      ) : null}
      {done && !review ? (
        <>
          <b>Satış tamamlandı. Karşı tarafı puanla:</b>
          <div className="starpick" role="radiogroup" aria-label="Puan">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={score === n} aria-label={`${n} yıldız`}
                className={n <= score ? 'on' : ''} onClick={() => setScore(n)}>★</button>
            ))}
          </div>
          <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorum (isteğe bağlı)" />
          <p><button className="btn" type="button" onClick={submitReview} disabled={busy || score < 1}>Puanı gönder</button></p>
        </>
      ) : null}
      {error ? <div className="alert low" role="alert">{error}</div> : null}
    </div>
  );
}
