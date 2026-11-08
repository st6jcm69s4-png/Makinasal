import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from './LText';
import { Icon } from './Icon';
import { supabase, tl } from '../lib/supabase';
import { tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

export type Auction = {
  id: string; listing_id: string; seller_id: string; start_price: number | string; min_increment: number | string;
  ends_at: string; status: 'active' | 'ended' | 'cancelled'; current_price: number | string | null; bid_count: number;
};
type Bid = { amount: number | string; created_at: string; bidder_no: number; mine: boolean };

/** Kalan süre: "2 gün 4 sa", "3 sa 12 dk", "4 dk 09 sn". */
export function timeLeft(endsAt: string, now = Date.now()): string {
  let s = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (d > 0) return `${d} ${tr('gün')} ${h} ${tr('sa')}`;
  if (h > 0) return `${h} ${tr('sa')} ${m} ${tr('dk')}`;
  return `${m} ${tr('dk')} ${String(s).padStart(2, '0')} ${tr('sn')}`;
}

export const nextMin = (a: Auction) => (a.current_price == null ? Number(a.start_price) : Number(a.current_price) + Number(a.min_increment));

function bidError(msg: string): string {
  if (msg.includes('BID_TOO_LOW')) return 'Teklifin en az gösterilen tutar kadar olmalı. Bu arada başka biri teklif vermiş olabilir.';
  if (msg.includes('ALREADY_LEADING')) return 'Zaten en yüksek teklif senin.';
  if (msg.includes('AUCTION_CLOSED')) return 'Açık artırma sona erdi.';
  if (msg.includes('OWN_AUCTION')) return 'Kendi açık artırmana teklif veremezsin.';
  if (msg.includes('MESSAGE_BLOCKED')) return 'Bu satıcıyla etkileşim kapalı.';
  if (msg.includes('RATE_LIMIT')) return 'Çok hızlı teklif veriyorsun. Biraz bekle.';
  if (msg.includes('LISTING_NOT_LIVE')) return 'İlan şu an yayında değil.';
  return 'Teklif verilemedi. Tekrar dene.';
}

/** İlan sayfasındaki açık artırma bölümü. */
export function AuctionBox({ auction: initial, own, signedIn, askLogin }: { auction: Auction; own: boolean; signedIn: boolean; askLogin: () => void }) {
  const [a, setA] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [bids, setBids] = useState<Bid[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    const [au, h, st] = await Promise.all([
      supabase.from('auctions').select('id,listing_id,seller_id,start_price,min_increment,ends_at,status,current_price,bid_count').eq('id', initial.id).maybeSingle(),
      supabase.rpc('auction_bid_history', { p_auction: initial.id }),
      signedIn ? supabase.rpc('my_auction_status', { p_auction: initial.id }) : Promise.resolve({ data: null }),
    ]);
    if (au.data) setA(au.data as Auction);
    if (!h.error) setBids((h.data ?? []) as Bid[]);
    setMine((st.data as string | null) ?? null);
  }, [initial.id, signedIn]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(() => void refresh(), 15000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [refresh]);

  const live = a.status === 'active' && Date.parse(a.ends_at) > now;
  const min = nextMin(a);
  const ending = live && Date.parse(a.ends_at) - now < 3600 * 1000;

  async function bid() {
    if (!signedIn) { askLogin(); return; }
    const n = Number(amount.replace(/\./g, '').replace(',', '.')) || min;
    if (n < min) { setErr(`${tr('En az')} ${tl(min)}`); return; }
    Alert.alert(tr('Teklifi onayla'), `${tl(n)} ${tr('teklif vereceksin. Açık artırmayı kazanırsan bu fiyattan satın almayı kabul etmiş olursun.')}`, [
      { text: tr('Vazgeç'), style: 'cancel' },
      {
        text: tr('Teklif ver'), onPress: async () => {
          setBusy(true); setErr('');
          const { error } = await supabase.rpc('place_bid', { p_auction: a.id, p_amount: n });
          setBusy(false);
          if (error) { setErr(tr(bidError(error.message))); void refresh(); return; }
          setAmount('');
          void refresh();
        },
      },
    ]);
  }

  async function cancel() {
    Alert.alert(tr('Açık artırma'), tr('Açık artırma iptal edilsin mi?'), [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('İptal et'), style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('cancel_auction', { p_auction: a.id });
        if (error) Alert.alert(tr('Açık artırma'), tr(error.message.includes('HAS_BIDS') ? 'Teklif gelmiş açık artırma iptal edilemez.' : 'İptal edilemedi.'));
        void refresh();
      } },
    ]);
  }

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={[s.badge, !live && { backgroundColor: color.plate }]}>
          <Icon name="award" size={13} color={live ? color.tealInk : color.muted} />
          <Text style={[s.badgeT, !live && { color: color.muted }]}>{live ? 'Açık artırma' : a.status === 'cancelled' ? 'İptal edildi' : 'Sona erdi'}</Text>
        </View>
        {live ? <View style={s.time}><Icon name="clock" size={14} color={ending ? color.bad : color.muted} /><PlainText style={[s.timeT, ending && { color: color.bad }]}>{timeLeft(a.ends_at, now)}</PlainText></View> : null}
      </View>

      <Text style={s.k}>{a.current_price == null ? 'Başlangıç fiyatı' : 'Güncel teklif'}</Text>
      <PlainText style={s.price}>{tl(a.current_price ?? a.start_price)}</PlainText>
      <PlainText style={s.meta}>{`${a.bid_count} ${tr('teklif')} · ${tr('Artış')} ${tl(a.min_increment)}`}</PlainText>

      {mine === 'leading' ? <View style={[s.state, { backgroundColor: color.tealSoft }]}><Icon name="check-circle" size={16} color={color.tealText} /><Text style={s.stateT}>En yüksek teklif senin</Text></View> : null}
      {mine === 'outbid' && live ? <View style={[s.state, { backgroundColor: color.warnBg }]}><Icon name="alert-circle" size={16} color={color.warn} /><Text style={s.stateT}>Teklifin geçildi</Text></View> : null}
      {mine === 'won' ? <View style={[s.state, { backgroundColor: color.tealSoft }]}><Icon name="award" size={16} color={color.tealText} /><Text style={s.stateT}>Açık artırmayı kazandın. Satıcıyla mesajlaşabilirsin.</Text></View> : null}

      {live && !own ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={s.bidRow}>
            <TextInput style={s.input} value={amount} onChangeText={(v) => { setAmount(v); setErr(''); }} keyboardType="number-pad" placeholder={`${tr('En az')} ${tl(min)}`} accessibilityLabel={tr('Teklif tutarı')} />
            <Pressable style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy || mine === 'leading'} onPress={() => void bid()} accessibilityRole="button">
              {busy ? <ActivityIndicator color={color.tealInk} /> : <Text style={s.btnT}>Teklif ver</Text>}
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[min, min + Number(a.min_increment), min + Number(a.min_increment) * 4].map((v) => (
              <Pressable key={v} style={s.quick} onPress={() => setAmount(String(Math.round(v)))} accessibilityRole="button">
                <PlainText style={s.quickT} numberOfLines={1}>{tl(Math.round(v))}</PlainText>
              </Pressable>
            ))}
          </View>
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      ) : null}

      {own && live ? (
        a.bid_count === 0
          ? <Pressable style={s.ghost} onPress={() => void cancel()} accessibilityRole="button"><Text style={s.ghostT}>Açık artırmayı iptal et</Text></Pressable>
          : <Text style={s.meta}>Teklif gelen açık artırma iptal edilemez. Süre bitince en yüksek teklifi verenle mesajlaşma otomatik açılır.</Text>
      ) : null}

      {bids.length ? (
        <View style={s.hist}>
          <Text style={s.histH}>Teklif geçmişi</Text>
          {bids.slice(0, 8).map((b, i) => (
            <View key={`${b.created_at}-${i}`} style={[s.histRow, i > 0 && s.sep]}>
              <PlainText style={[s.histWho, b.mine && { color: color.tealText, fontFamily: font.bold }]}>{b.mine ? tr('Sen') : `${tr('Teklif veren')} ${b.bidder_no}`}</PlainText>
              <PlainText style={s.histWhen}>{new Date(b.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</PlainText>
              <PlainText style={s.histAmt}>{tl(b.amount)}</PlainText>
            </View>
          ))}
        </View>
      ) : null}
      {live ? <Text style={s.note}>Son 5 dakikada gelen her teklif süreyi 5 dakika uzatır. Teklif verenlerin adı gizlidir.</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 4, borderWidth: 1.5, borderColor: color.teal, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: color.teal, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  badgeT: { color: color.tealInk, fontFamily: font.bold, fontSize: 12.5 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeT: { color: color.ink, fontFamily: font.bold, fontSize: 15 },
  k: { color: color.muted, fontSize: 13.5 },
  price: { color: color.tealText, fontFamily: font.bold, fontSize: 28 },
  meta: { color: color.muted, fontSize: 13, lineHeight: 18 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius, padding: 10, marginTop: 6 },
  stateT: { color: color.ink, fontFamily: font.semi, fontSize: 14, flex: 1 },
  bidRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, fontSize: 16, color: color.ink, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  btn: { minHeight: 50, paddingHorizontal: 18, borderRadius: radius, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  quick: { flex: 1, minHeight: 38, borderRadius: radius, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  quickT: { color: color.ink, fontFamily: font.semi, fontSize: 13 },
  err: { color: color.bad, fontSize: 13.5 },
  ghost: { minHeight: 46, borderRadius: radius, borderWidth: 1.5, borderColor: color.bad, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ghostT: { color: color.bad, fontFamily: font.semi, fontSize: 15 },
  hist: { marginTop: 10, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 8 },
  histH: { color: color.ink, fontFamily: font.bold, fontSize: 14.5, marginBottom: 4 },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  sep: { borderTopWidth: 1, borderTopColor: color.line },
  histWho: { flex: 1, color: color.ink, fontSize: 14 },
  histWhen: { color: color.muted, fontSize: 12.5 },
  histAmt: { color: color.ink, fontFamily: font.bold, fontSize: 14, minWidth: 96, textAlign: 'right' },
  note: { color: color.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
