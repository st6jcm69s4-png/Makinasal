import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './LText';
import { supabase } from '../lib/supabase';

type Deal = { buyer_confirmed: boolean; seller_confirmed: boolean; completed_at: string | null };
type Review = { score: number; comment: string | null; tags?: string[] };
const TAGS = ['İlana uygun çıktı', 'Belgeler tamdı', 'Hızlı cevap verdi', 'Fiyat tutarlıydı'];
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function DealBox({ threadId, me, buyerId, sellerId }: { threadId: string; me: string; buyerId: string; sellerId: string }) {
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
    const { data: d } = await supabase.from('deals').select('buyer_confirmed,seller_confirmed,completed_at').eq('thread_id', threadId).maybeSingle();
    setDeal((d as Deal | null) ?? null);
    let rr = await supabase.from('reviews').select('score,comment,tags').eq('thread_id', threadId).eq('reviewer_id', me).maybeSingle();
    if (rr.error) rr = await supabase.from('reviews').select('score,comment').eq('thread_id', threadId).eq('reviewer_id', me).maybeSingle();
    setReview((rr.data as Review | null) ?? null);
    setLoaded(true);
  }, [threadId, me]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 5000); return () => clearInterval(t); }, [load]);

  async function confirmDeal() {
    setBusy(true); setError('');
    const mine = iAmBuyer ? 'buyer_confirmed' : 'seller_confirmed';
    const res = deal
      ? await supabase.from('deals').update({ [mine]: true }).eq('thread_id', threadId)
      : await supabase.from('deals').insert({ thread_id: threadId, buyer_confirmed: iAmBuyer, seller_confirmed: !iAmBuyer });
    if (res.error) setError('Onay kaydedilemedi. Tekrar dene.');
    await load(); setBusy(false);
  }
  function ask() {
    Alert.alert('Satış onayı', 'Satışın gerçekleştiğini onaylıyor musun? Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => void confirmDeal() },
    ]);
  }
  async function submitReview() {
    if (score < 1) { setError('Önce yıldız seç.'); return; }
    setBusy(true); setError('');
    const row = { thread_id: threadId, reviewer_id: me, reviewee_id: iAmBuyer ? sellerId : buyerId, role: iAmBuyer ? 'seller' : 'buyer', score, comment: comment.trim() || null };
    let { error: err } = await supabase.from('reviews').insert({ ...row, tags });
    if (err && /tags/.test(err.message)) ({ error: err } = await supabase.from('reviews').insert(row));
    if (err) setError('Puan kaydedilemedi. Tekrar dene.');
    await load(); setBusy(false);
  }

  if (!loaded) return null;
  const myOk = !!deal && (iAmBuyer ? deal.buyer_confirmed : deal.seller_confirmed);
  const otherOk = !!deal && (iAmBuyer ? deal.seller_confirmed : deal.buyer_confirmed);
  const done = !!deal && deal.buyer_confirmed && deal.seller_confirmed;
  return (
    <View style={s.box}>
      {!done && !myOk ? (
        <>
          <Text style={s.b}>{otherOk ? 'Karşı taraf satışı onayladı.' : 'Satış gerçekleşti mi?'}</Text>
          <Text style={s.small}>İki taraf da onaylayınca birbirinizi puanlayabilirsiniz. Ürünü teslim aldıktan / ödemeyi aldıktan sonra onayla.</Text>
          <Pressable style={s.btn} disabled={busy} onPress={ask} accessibilityRole="button"><Text style={s.btnText}>Satış gerçekleşti</Text></Pressable>
        </>
      ) : null}
      {!done && myOk ? <Text style={s.b}>Onayın alındı. Karşı tarafın onayı bekleniyor…</Text> : null}
      {done && review ? (
        <>
          <Text style={s.b}>Satış tamamlandı.</Text>
          <Text style={s.small}>Verdiğin puan: {stars(review.score)}{review.comment ? ` — “${review.comment}”` : ''}{review.tags?.length ? ` · ${review.tags.join(', ')}` : ''}</Text>
        </>
      ) : null}
      {done && !review ? (
        <>
          <Text style={s.b}>Satış tamamlandı. Karşı tarafı puanla:</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setScore(n)} accessibilityRole="button" accessibilityLabel={`${n} yıldız`}><Text style={[s.star, n <= score && { color: '#e0a100' }]}>★</Text></Pressable>
            ))}
          </View>
          <View style={s.tags}>
            {TAGS.map((t) => (
              <Pressable key={t} style={[s.tag, tags.includes(t) && s.tagOn]} onPress={() => setTags((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>
                <Text style={tags.includes(t) ? { color: '#fff' } : undefined}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={s.input} value={comment} onChangeText={setComment} placeholder="Yorum (isteğe bağlı)" maxLength={500} multiline />
          <Pressable style={s.btn} disabled={busy || score < 1} onPress={() => void submitReview()} accessibilityRole="button"><Text style={s.btnText}>Puanı gönder</Text></Pressable>
        </>
      ) : null}
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#fff', margin: 10, padding: 12, borderRadius: 4, gap: 8 },
  b: { fontWeight: '700' },
  small: { color: '#666', fontSize: 12 },
  btn: { backgroundColor: '#800020', padding: 12, borderRadius: 4, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  star: { fontSize: 30, color: '#ccc' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderColor: '#DDD9DC', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 },
  tagOn: { backgroundColor: '#800020', borderColor: '#800020' },
  input: { padding: 10, backgroundColor: '#F6F5F3', borderRadius: 4, minHeight: 50 },
  err: { color: '#b00020' },
});
