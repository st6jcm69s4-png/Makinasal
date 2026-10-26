import { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../../components/PickerModal';
import { QuoteChat } from '../../../components/QuoteChat';
import { Btn, common, Field, Select } from '../../../components/ui';
import { useApp } from '../../../lib/AppContext';
import { dateLabel, money, networkError, PERSONNEL_ROLES, POST_KINDS, QUOTE_STATUS, RENTAL_MODES, UNITS, type MarketPost, type Quote } from '../../../lib/network';
import { supabase } from '../../../lib/supabase';
import { openWeb } from '../../../lib/web';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useApp();
  const uid = session?.user.id;
  const [post, setPost] = useState<MarketPost | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('toplam');
  const [note, setNote] = useState('');
  const [unitSheet, setUnitSheet] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase.from('market_posts').select('*').eq('id', id).maybeSingle();
    if (r.error || !r.data) { setError(r.error ? networkError(r.error) : 'İlan bulunamadı veya yayından kaldırıldı.'); setLoading(false); return; }
    setPost(r.data as MarketPost);
    if (uid) {
      const q = await supabase.from('market_quotes').select('*').eq('post_id', id).order('created_at');
      if (q.error) setError('Teklifler yüklenemedi.'); else { setError(''); setQuotes((q.data ?? []) as Quote[]); }
    }
    setLoading(false);
  }, [id, uid]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  if (!post) return <Text style={common.empty}>{error || 'İlan bulunamadı.'}</Text>;
  const isOwner = uid === post.owner_id;
  const mine = quotes.find((q) => q.bidder_id === uid);
  const selected = quotes.some((q) => q.status === 'accepted');

  function confirm(msg: string, ok: () => void) {
    Alert.alert('Onay', msg, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet', onPress: ok }]);
  }
  async function setStatus(status: string) {
    setBusy(true);
    const r = await supabase.from('market_posts').update({ status }).eq('id', id).eq('owner_id', uid!).select('id').single();
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else void load();
  }
  async function quoteAction(q: Quote, status: string) {
    setBusy(true);
    const r = await supabase.from('market_quotes').update({ status }).eq('id', q.id).select('id').single();
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else void load();
  }
  async function submitQuote() {
    if (!uid) { router.push('/(tabs)/hesap'); return; }
    const n = Number(amount.replace(',', '.'));
    if (name.trim().length < 2 || !(n > 0)) { setError('Teklif veren adı ve geçerli bir tutar gir.'); return; }
    setBusy(true); setError('');
    const data = { display_name: name.trim(), amount: n, price_unit: unit, note: note.trim() };
    const r = mine
      ? await supabase.from('market_quotes').update(data).eq('id', mine.id).select('id').single()
      : await supabase.from('market_quotes').insert({ ...data, post_id: post!.id, owner_id: post!.owner_id, bidder_id: uid }).select('id').single();
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else void load();
  }

  const rows: [string, string][] = [
    ['Tür', POST_KINDS[post.kind]], ['Kategori', post.category], ['Marka / model', `${post.brand} ${post.model}`.trim()],
    ['Konum', [post.city, post.district].filter(Boolean).join(' / ')],
    ['Çalışma türü', post.rental_mode ? RENTAL_MODES[post.rental_mode as keyof typeof RENTAL_MODES] : post.personnel_role ? PERSONNEL_ROLES[post.personnel_role as keyof typeof PERSONNEL_ROLES] : ''],
    ['Tarih', post.start_date ? `${dateLabel(post.start_date)}${post.end_date ? ' – ' + dateLabel(post.end_date) : ''}` : ''],
    ['Adet', String(post.quantity)], ['Özellikler', post.specs],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} style={common.screen}>
      <View style={common.card}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{post.title}</Text>
        <Text style={common.price}>{money(post.price, post.price_unit)}</Text>
        {post.status !== 'open' ? <Text style={common.err}>{post.status === 'closed' ? 'Bu ilan kapatıldı.' : 'Bu ilan yayından kaldırıldı.'}</Text> : null}
        {rows.filter(([, v]) => v).map(([k, v]) => <Text key={k}><Text style={{ fontWeight: '600' }}>{k}: </Text>{v}</Text>)}
        <Text style={{ marginTop: 6 }}>{post.description}</Text>
      </View>
      {error ? <Text style={common.err}>{error}</Text> : null}

      {isOwner ? (
        <View style={{ gap: 8 }}>
          <Btn title="İlanı düzenle" onPress={() => router.push(`/ag/yeni?edit=${post.id}` as never)} />
          {post.status === 'open' ? <Btn ghost title="İlanı kapat" disabled={busy} onPress={() => confirm('Yeni teklif alınmayacak. Kapatılsın mı?', () => void setStatus('closed'))} /> : null}
          {post.status === 'closed' ? <Btn ghost title="Tekrar aç" disabled={busy} onPress={() => void setStatus('open')} /> : null}
          {post.status !== 'removed' ? <Btn danger title="Yayından kaldır" disabled={busy} onPress={() => confirm('İlan yayından kaldırılsın mı? Teklif geçmişi korunur.', () => void setStatus('removed'))} /> : null}
        </View>
      ) : null}

      {!uid ? <Btn title="Teklif vermek için giriş yap" onPress={() => router.push('/(tabs)/hesap')} /> : null}

      {uid && !isOwner && post.status === 'open' && !selected ? (
        <View style={[common.card, { gap: 10 }]}>
          <Text style={common.h2}>{mine ? 'Teklifini güncelle' : 'Teklif ver'}</Text>
          <Field label="Teklif veren (firma / kişi adı)" value={name} onChangeText={setName} />
          <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Select label="Birim" value={unit} onPress={() => setUnitSheet(true)} />
          <Field label="Not" value={note} onChangeText={setNote} multiline />
          <Btn title={mine ? 'Teklifi güncelle' : 'Teklifi gönder'} onPress={() => void submitQuote()} disabled={busy} />
          <PickerModal visible={unitSheet} title="Birim" selected={unit} options={UNITS.map((u) => ({ value: u, label: u }))} onPick={setUnit} onClose={() => setUnitSheet(false)} />
        </View>
      ) : null}

      {uid && quotes.length ? <Text style={common.h2}>{isOwner ? 'Gelen teklifler' : 'Teklifin'}</Text> : null}
      {quotes.map((q) => (
        <View key={q.id} style={common.card}>
          <Text style={common.title}>{q.display_name}</Text>
          <Text style={common.price}>{money(q.amount, q.price_unit)}</Text>
          <Text style={common.meta}>{QUOTE_STATUS[q.status]}{q.note ? ` · ${q.note}` : ''}</Text>
          {isOwner && q.status === 'accepted' && q.price_unit === 'toplam' ? <Btn ghost title="Güvenli ödeme seçenekleri" onPress={() => openWeb('/odeme?teklif=' + q.id)} /> : null}
          {isOwner && q.status === 'pending' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {!selected ? <View style={{ flex: 1 }}><Btn title="Seç" disabled={busy} onPress={() => confirm('Bu teklifi seçmek istiyor musun? Seçim geri alınamaz ve ödeme oluşturmaz. Kapsamı mesajla doğrula.', () => void quoteAction(q, 'accepted'))} /></View> : null}
              <View style={{ flex: 1 }}><Btn ghost title="Reddet" disabled={busy} onPress={() => void quoteAction(q, 'declined')} /></View>
            </View>
          ) : null}
          {q.bidder_id === uid && q.status === 'pending' ? <Btn ghost title="Teklifi geri çek" disabled={busy} onPress={() => void quoteAction(q, 'withdrawn')} /> : null}
          {uid && q.status !== 'withdrawn' ? <QuoteChat quoteId={q.id} userId={uid} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}
