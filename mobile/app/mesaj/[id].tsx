import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { DealBox } from '../../components/DealBox';
import { checkMessage } from '../../lib/messageFilter';
import { supabase } from '../../lib/supabase';

type Msg = { id: string; sender_id: string; body: string; created_at: string; kind?: string | null; offer_amount?: number | null };
type ThreadInfo = { buyer_id: string; seller_id: string; title: string };
const PAGE = 50;

export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useApp();
  const me = session?.user.id;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [info, setInfo] = useState<ThreadInfo | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    let res = await supabase.from('messages').select('id,sender_id,body,created_at,kind,offer_amount')
      .eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE);
    if (res.error) res = await supabase.from('messages').select('id,sender_id,body,created_at').eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE);
    const { data, error: e } = res;
    if (!alive.current) return;
    if (e) { setError('Mesajlar yüklenemedi. Bağlantını kontrol et.'); return; }
    setError('');
    setMsgs((data ?? []) as Msg[]); // en yeni en üstte (liste ters çevrilmiş gösterilir)
    void supabase.rpc('mark_thread_read', { p_thread: id });
  }, [id]);

  useEffect(() => {
    void supabase.from('threads').select('buyer_id,seller_id,listings(title)').eq('id', id).maybeSingle().then(({ data }) => {
      const t = data as unknown as { buyer_id: string; seller_id: string; listings: { title: string } | { title: string }[] | null } | null;
      if (t) { const l = Array.isArray(t.listings) ? t.listings[0] : t.listings; setInfo({ buyer_id: t.buyer_id, seller_id: t.seller_id, title: l?.title ?? 'İlan' }); }
    });
  }, [id]);

  useEffect(() => {
    alive.current = true;
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => { alive.current = false; clearInterval(t); };
  }, [load]);

  async function reallySend(body: string) {
    if (!me) return;
    setBusy(true); setError('');
    const { error: e } = await supabase.from('messages').insert({ thread_id: id, sender_id: me, body });
    setBusy(false);
    if (e) {
      setError(e.message.includes('MESSAGE_PROFANITY') ? 'Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.'
        : /RATE_LIMIT/.test(e.message) ? 'Çok fazla mesaj gönderdin. Bir dakika sonra tekrar dene.' : 'Mesaj gönderilemedi. Yazdığın mesaj korunuyor.');
      return;
    }
    setText('');
    void load();
  }

  function send() {
    const body = text.trim();
    if (!body || busy) return;
    const check = checkMessage(body);
    if (check.block) { setError(check.block); return; }
    if (check.warn) {
      Alert.alert('Dikkat', 'Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermek dolandırıcılık riski taşır. Yine de göndermek istiyor musun?', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gönder', onPress: () => void reallySend(body) },
      ]);
      return;
    }
    void reallySend(body);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F6F5F3' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {info ? <Text style={s.hint2} numberOfLines={1}>İlan: {info.title}</Text> : null}
      {info && me ? <DealBox threadId={id} me={me} buyerId={info.buyer_id} sellerId={info.seller_id} /> : null}
      <FlatList
        inverted
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz mesaj yok. İlk mesajı sen yaz.</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return (
            <View style={[s.bubble, mine ? s.mine : s.theirs, item.kind === 'offer' && s.offer]}>
              {item.kind === 'offer' ? <Text style={mine ? s.mineText : s.theirsText}>💰 Teklif</Text> : null}
              <Text style={mine ? s.mineText : s.theirsText}>{item.body}</Text>
            </View>
          );
        }}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
      <Text style={s.hint}>Mesajlarda IBAN ve harici link paylaşımı engellenir.</Text>
      <View style={s.bar}>
        <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Mesajını yaz" multiline maxLength={2000} />
        <Pressable style={[s.send, busy && { opacity: 0.5 }]} onPress={send} disabled={busy} accessibilityRole="button"><Text style={s.sendText}>Gönder</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
  offer: { borderWidth: 2, borderColor: '#e0a100' },
  hint2: { color: '#666', paddingHorizontal: 12, paddingTop: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#800020' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  mineText: { color: '#fff' },
  theirsText: { color: '#25272D' },
  empty: { textAlign: 'center', color: '#666', margin: 24, transform: [{ scaleY: -1 }] },
  err: { color: '#b00020', marginHorizontal: 12 },
  hint: { color: '#888', fontSize: 12, marginHorizontal: 12, marginBottom: 4 },
  bar: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, maxHeight: 100, padding: 10, backgroundColor: '#F6F5F3', borderRadius: 8 },
  send: { backgroundColor: '#800020', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: '600' },
});
