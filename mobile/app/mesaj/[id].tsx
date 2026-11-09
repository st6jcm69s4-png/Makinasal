import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { tr } from '../../lib/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { DealBox } from '../../components/DealBox';
import { PickerModal } from '../../components/PickerModal';
import { checkMessage } from '../../lib/messageFilter';
import { supabase } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string; kind?: string | null; offer_amount?: number | null };
type ThreadInfo = { buyer_id: string; seller_id: string; title: string; listing_id: string | null };
const REASONS = [
  { value: 'abuse', label: 'Küfür veya hakaret' },
  { value: 'harassment', label: 'Taciz veya tehdit' },
  { value: 'fraud', label: 'Dolandırıcılık şüphesi' },
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'other', label: 'Diğer' },
];
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const PAGE = 50;
/** Tekrar göndermede aynı mesajın iki kez yazılmaması için istemci tarafı kimlik (UUID v4). */
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
const merge = (a: Msg[], b: Msg[]) => { const seen = new Set<string>(); return [...a, ...b].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))).sort((x, y) => y.created_at.localeCompare(x.created_at)); };

export default function Thread() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useApp();
  const me = session?.user.id;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [older, setOlder] = useState<Msg[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const pending = useRef<{ body: string; id: string } | null>(null);
  const [info, setInfo] = useState<ThreadInfo | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const [blocked, setBlocked] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const other = info && me ? (info.buyer_id === me ? info.seller_id : info.buyer_id) : null;
  useEffect(() => {
    if (!me || !other) return;
    void supabase.from('user_blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', other).maybeSingle().then((r) => setBlocked(!!r.data));
  }, [me, other]);
  function blockMenu() {
    if (!me || !other) return;
    if (blocked) {
      Alert.alert(tr('Engeli kaldır'), tr('Bu kişinin engeli kaldırılsın mı? Tekrar mesajlaşabilirsiniz.'), [
        { text: tr('Vazgeç'), style: 'cancel' },
        { text: tr('Engeli kaldır'), onPress: async () => { const r = await supabase.from('user_blocks').delete().eq('blocker_id', me).eq('blocked_id', other); if (!r.error) setBlocked(false); } },
      ]);
      return;
    }
    Alert.alert(tr('Kişiyi engelle'), tr('Bu kişi engellensin mi? Birbirinize mesaj gönderemezsiniz. Rahatsız edici bir mesaj varsa mesaja basılı tutarak şikayet de edebilirsin.'), [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Engelle'), style: 'destructive', onPress: async () => { const r = await supabase.from('user_blocks').insert({ blocker_id: me, blocked_id: other }); if (!r.error || r.error.code === '23505') setBlocked(true); else Alert.alert(tr('Engelle'), tr('İşlem kaydedilemedi.')); } },
    ]);
  }
  async function report(reason: string) {
    const id2 = reportMsg; setReportMsg(null);
    if (!id2) return;
    const r = await supabase.from('message_reports').insert({ message_id: id2, reason });
    if (!r.error) Alert.alert(tr('Şikayet'), tr('Şikayetin alındı. Ekibimiz inceleyecek. İstersen bu kişiyi engelleyebilirsin.'));
    else Alert.alert(tr('Şikayet'), r.error.code === '23505' ? tr('Bu mesajı zaten şikayet ettin.') : tr('Şikayet gönderilemedi. Daha sonra tekrar dene.'));
  }

  const load = useCallback(async () => {
    const detailed = await supabase.from('messages').select('id,sender_id,body,created_at,kind,offer_amount')
      .eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE);
    const { data, error: e } = detailed.error
      ? await supabase.from('messages').select('id,sender_id,body,created_at').eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE)
      : detailed;
    if (!alive.current) return;
    if (e) { setError('Mesajlar yüklenemedi. Bağlantını kontrol et.'); return; }
    setError('');
    const rows = (data ?? []) as Msg[];
    setMsgs(rows); // en yeni en üstte (liste ters çevrilmiş gösterilir)
    if (rows.length < PAGE) setHasMore(false);
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

  /** Yukarı kaydırınca daha eski mesajları getirir. */
  async function loadOlder() {
    if (loadingOlder || !hasMore) return;
    const all = merge(msgs, older);
    const oldest = all[all.length - 1];
    if (!oldest) return;
    setLoadingOlder(true);
    const r = await supabase.from('messages').select('id,sender_id,body,created_at,kind,offer_amount')
      .eq('thread_id', id).lt('created_at', oldest.created_at).order('created_at', { ascending: false }).limit(PAGE);
    setLoadingOlder(false);
    if (r.error) return;
    const rows = (r.data ?? []) as Msg[];
    setOlder((cur) => merge(cur, rows));
    if (rows.length < PAGE) setHasMore(false);
  }

  async function reallySend(body: string) {
    if (!me) return;
    // Aynı metin yeniden gönderilirse aynı kimlik kullanılır; sunucu ikinciyi reddeder (23505), çift mesaj oluşmaz.
    if (!pending.current || pending.current.body !== body) pending.current = { body, id: uuid() };
    const messageId = pending.current.id;
    setBusy(true); setError('');
    let e: { message: string; code?: string } | null = null;
    try {
      ({ error: e } = await supabase.from('messages').insert({ id: messageId, thread_id: id, sender_id: me, body }));
    } catch { e = { message: 'NETWORK' }; }
    setBusy(false);
    if (e && e.code === '23505') e = null; // önceki deneme zaten ulaşmış
    if (e) {
      setError(e.message.includes('MESSAGE_BLOCKED') ? 'Bu kullanıcıyla mesajlaşma kapalı.' : e.message.includes('MESSAGE_PROFANITY') ? 'Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.'
        : /RATE_LIMIT/.test(e.message) ? 'Çok fazla mesaj gönderdin. Bir dakika sonra tekrar dene.' : 'Mesaj gönderilemedi. Yazdığın mesaj korunuyor.');
      return;
    }
    if (pending.current?.id === messageId) pending.current = null;
    setText((cur) => (cur.trim() === body ? '' : cur));
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior="padding" keyboardVerticalOffset={90}>
      {info ? (
        <Pressable style={({ pressed }) => [s.listing, pressed && { opacity: 0.85 }]} disabled={!info.listing_id} onPress={() => info.listing_id && router.push(`/ilan/${info.listing_id}`)} accessibilityRole="button">
          <View style={s.listingIcon}><Icon name="truck" size={18} color={color.tealText} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.listingK}>İlan</Text>
            <PlainText style={s.listingT} numberOfLines={1}>{info.title}</PlainText>
          </View>
          {info.listing_id ? <Icon name="chevron-right" size={18} color={color.muted} /> : null}
          <Pressable onPress={blockMenu} hitSlop={10} style={s.more} accessibilityRole="button" accessibilityLabel={tr(blocked ? 'Engeli kaldır' : 'Kişiyi engelle')}>
            <Icon name={blocked ? 'unlock' : 'slash'} size={18} color={blocked ? color.tealText : color.bad} />
          </Pressable>
        </Pressable>
      ) : null}
      {info && me ? <DealBox threadId={id} me={me} buyerId={info.buyer_id} sellerId={info.seller_id} /> : null}
      <FlatList
        inverted
        data={merge(msgs, older)}
        keyExtractor={(m) => m.id}
        onEndReached={() => void loadOlder()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingOlder ? <ActivityIndicator style={{ marginVertical: 10 }} color={color.teal} /> : !hasMore && msgs.length >= PAGE ? <Text style={s.empty}>Konuşmanın başı</Text> : null}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz mesaj yok. İlk mesajı sen yaz.</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return (
            <Pressable onLongPress={() => (!mine ? setReportMsg(item.id) : undefined)} delayLongPress={350} style={[s.bubble, mine ? s.mine : s.theirs, item.kind === 'offer' && s.offer]} accessibilityHint={!mine ? tr('Şikayet etmek için basılı tut') : undefined}>
              {item.kind === 'offer' ? <View style={[s.offerTag, mine && { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Icon name="tag" size={12} color={mine ? color.tealInk : color.warn} /><Text style={[s.offerTagT, { color: mine ? color.tealInk : color.warn }]}>Teklif</Text></View> : null}
              <PlainText selectable style={mine ? s.mineText : s.theirsText}>{item.body}</PlainText>
              <PlainText style={[s.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>{hhmm(item.created_at)}</PlainText>
            </Pressable>
          );
        }}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
      {blocked ? (
        <View style={s.blockedBar}>
          <Icon name="slash" size={18} color={color.bad} />
          <Text style={s.blockedT}>Bu kişiyi engelledin. Mesaj gönderemezsiniz.</Text>
          <Pressable onPress={blockMenu} accessibilityRole="button"><Text style={s.unblock}>Engeli kaldır</Text></Pressable>
        </View>
      ) : <View style={s.bar}>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Mesajını yaz" multiline maxLength={2000} />
        </View>
        <Pressable style={[s.send, (busy || !text.trim()) && { opacity: 0.45 }]} onPress={send} disabled={busy || !text.trim()} accessibilityRole="button" accessibilityLabel={tr('Gönder')}>
          <Icon name="send" size={19} color={color.tealInk} />
        </Pressable>
      </View>}
      <Text style={[s.hint, { paddingBottom: Math.max(insets.bottom, 10) }]}>Mesajlarda IBAN ve harici link paylaşımı engellenir. Rahatsız edici bir mesajı basılı tutarak şikayet edebilirsin.</Text>
      <PickerModal visible={!!reportMsg} title="Şikayet nedeni" selected="" options={REASONS} onPick={(v) => void report(v)} onClose={() => setReportMsg(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  more: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
  blockedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: color.badBg, borderTopWidth: 1, borderTopColor: color.line },
  blockedT: { flex: 1, color: color.ink, fontSize: 14 },
  unblock: { color: color.tealText, fontFamily: font.semi, fontSize: 14 },
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
  hint: { color: color.muted, fontSize: 11.5, textAlign: 'center', paddingHorizontal: 14, paddingBottom: 10, paddingTop: 4, backgroundColor: color.bg },
  bar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: color.bg, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: color.line },
  input: { maxHeight: 120, minHeight: 46, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 16, backgroundColor: color.surface, borderRadius: 23, borderWidth: 1, borderColor: color.line },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
});
