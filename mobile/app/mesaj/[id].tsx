import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { tr } from '../../lib/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { DealBox } from '../../components/DealBox';
import { checkMessage } from '../../lib/messageFilter';
import { supabase } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string; kind?: string | null; offer_amount?: number | null };
type ThreadInfo = { buyer_id: string; seller_id: string; title: string; listing_id: string | null };
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
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
    const detailed = await supabase.from('messages').select('id,sender_id,body,created_at,kind,offer_amount')
      .eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE);
    const { data, error: e } = detailed.error
      ? await supabase.from('messages').select('id,sender_id,body,created_at').eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE)
      : detailed;
    if (!alive.current) return;
    if (e) { setError('Mesajlar yüklenemedi. Bağlantını kontrol et.'); return; }
    setError('');
    setMsgs((data ?? []) as Msg[]); // en yeni en üstte (liste ters çevrilmiş gösterilir)
    void supabase.rpc('mark_thread_read', { p_thread: id });
  }, [id]);

  useEffect(() => {
    void supabase.from('threads').select('buyer_id,seller_id,listing_id,listings(title)').eq('id', id).maybeSingle().then(({ data }) => {
      const t = data as unknown as { buyer_id: string; seller_id: string; listing_id: string | null; listings: { title: string } | { title: string }[] | null } | null;
      if (t) { const l = Array.isArray(t.listings) ? t.listings[0] : t.listings; setInfo({ buyer_id: t.buyer_id, seller_id: t.seller_id, title: l?.title ?? 'İlan', listing_id: t.listing_id }); }
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {info ? (
        <Pressable style={({ pressed }) => [s.listing, pressed && { opacity: 0.85 }]} disabled={!info.listing_id} onPress={() => info.listing_id && router.push(`/ilan/${info.listing_id}`)} accessibilityRole="button">
          <View style={s.listingIcon}><Icon name="truck" size={18} color={color.tealText} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.listingK}>İlan</Text>
            <PlainText style={s.listingT} numberOfLines={1}>{info.title}</PlainText>
          </View>
          {info.listing_id ? <Icon name="chevron-right" size={18} color={color.muted} /> : null}
        </Pressable>
      ) : null}
      {info && me ? <DealBox threadId={id} me={me} buyerId={info.buyer_id} sellerId={info.seller_id} /> : null}
      <FlatList
        inverted
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz mesaj yok. İlk mesajı sen yaz.</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return (
            <View style={[s.bubble, mine ? s.mine : s.theirs, item.kind === 'offer' && s.offer]}>
              {item.kind === 'offer' ? <View style={[s.offerTag, mine && { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Icon name="tag" size={12} color={mine ? color.tealInk : color.warn} /><Text style={[s.offerTagT, { color: mine ? color.tealInk : color.warn }]}>Teklif</Text></View> : null}
              <PlainText selectable style={mine ? s.mineText : s.theirsText}>{item.body}</PlainText>
              <PlainText style={[s.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>{hhmm(item.created_at)}</PlainText>
            </View>
          );
        }}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
      <View style={s.bar}>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Mesajını yaz" multiline maxLength={2000} />
        </View>
        <Pressable style={[s.send, (busy || !text.trim()) && { opacity: 0.45 }]} onPress={send} disabled={busy || !text.trim()} accessibilityRole="button" accessibilityLabel={tr('Gönder')}>
          <Icon name="send" size={19} color={color.tealInk} />
        </Pressable>
      </View>
      <Text style={s.hint}>Mesajlarda IBAN ve harici link paylaşımı engellenir.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  listing: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 10, padding: 10, backgroundColor: color.surface, borderRadius: radius + 2, borderWidth: 1, borderColor: color.line },
  listingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  listingK: { color: color.muted, fontSize: 12 },
  listingT: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingTop: 9, paddingBottom: 6, borderRadius: 18, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: color.teal, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: color.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: color.line },
  offer: { borderWidth: 2, borderColor: color.warn },
  offerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: color.warnBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 2 },
  offerTagT: { fontSize: 12, fontWeight: '700' },
  mineText: { color: color.tealInk, fontSize: 15.5, lineHeight: 21 },
  theirsText: { color: color.ink, fontSize: 15.5, lineHeight: 21 },
  time: { alignSelf: 'flex-end', fontSize: 11, color: color.muted },
  empty: { textAlign: 'center', color: color.muted, margin: 24, transform: [{ scaleY: -1 }] },
  err: { color: color.bad, marginHorizontal: 14, marginBottom: 4 },
  hint: { color: color.muted, fontSize: 11.5, textAlign: 'center', paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 26 : 10, paddingTop: 4, backgroundColor: color.bg },
  bar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: color.bg, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: color.line },
  input: { maxHeight: 120, minHeight: 46, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 16, backgroundColor: color.surface, borderRadius: 23, borderWidth: 1, borderColor: color.line },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
});
