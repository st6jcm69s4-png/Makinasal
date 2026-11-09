import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text, TextInput } from './LText';
import { Icon, type IconName } from './Icon';
import { supabase, tl } from '../lib/supabase';
import { tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

export type Auction = {
  id: string; listing_id: string; seller_id: string; start_price: number | string; min_increment: number | string;
  ends_at: string; status: 'active' | 'ended' | 'cancelled'; current_price: number | string | null; bid_count: number;
};
type Bid = { amount: number | string; created_at: string; bidder_no: number; mine: boolean };
type Details = {
  my_bid: number | null; withdrawals_left: number; premium: boolean; banned: boolean;
  offer: { amount: number; expires_at: string } | null;
  seller: { has_winner: boolean; winner_at: string | null; can_report: boolean; unpaid_status: 'pending' | 'confirmed' | 'rejected' | null; offer_pending: boolean } | null;
};

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
const HOUR = 3600 * 1000;

function errText(msg: string): string {
  if (msg.includes('PREMIUM_REQUIRED')) return 'Açık artırmalara yalnızca Pro ve Firma Pro üyeler katılabilir.';
  if (msg.includes('AUCTION_BANNED')) return 'Daha önce kazandığın bir açık artırmadan vazgeçtiğin için açık artırmalara katılamazsın.';
  if (msg.includes('BID_TOO_LOW')) return 'Teklifin en az gösterilen tutar kadar olmalı. Bu arada başka biri teklif vermiş olabilir.';
  if (msg.includes('ALREADY_LEADING')) return 'Zaten en yüksek teklif senin.';
  if (msg.includes('AUCTION_CLOSED')) return 'Açık artırma sona erdi.';
  if (msg.includes('OWN_AUCTION')) return 'Kendi açık artırmana teklif veremezsin.';
  if (msg.includes('MESSAGE_BLOCKED')) return 'Bu satıcıyla etkileşim kapalı.';
  if (msg.includes('RATE_LIMIT')) return 'Çok hızlı teklif veriyorsun. Biraz bekle.';
  if (msg.includes('LISTING_NOT_LIVE')) return 'İlan şu an yayında değil.';
  if (msg.includes('WITHDRAW_CLOSED')) return 'Bitime 1 saatten az kaldığı için teklif geri çekilemez veya düşürülemez.';
  if (msg.includes('WITHDRAW_LIMIT')) return 'Bir açık artırmada en fazla 2 kez teklif geri çekebilir veya düşürebilirsin.';
  if (msg.includes('NEW_AMOUNT_NOT_LOWER')) return 'Yeni tutar mevcut teklifinden düşük olmalı.';
  if (msg.includes('BELOW_START')) return 'Yeni tutar başlangıç fiyatından düşük olamaz.';
  if (msg.includes('AMOUNT_TAKEN')) return 'Bu tutarda başka bir teklif var. Farklı bir tutar gir.';
  if (msg.includes('NO_OFFER')) return 'Teklifin süresi dolmuş.';
  if (msg.includes('ALREADY_REPORTED')) return 'Bu açık artırma için zaten bildirim yapıldı.';
  if (msg.includes('REPORT_EXPIRED')) return 'Bildirim süresi (7 gün) doldu.';
  return 'İşlem yapılamadı. Tekrar dene.';
}

function Note({ icon, tone, children }: { icon: IconName; tone: 'good' | 'warn' | 'bad'; children: string }) {
  const bg = tone === 'good' ? color.tealSoft : tone === 'warn' ? color.warnBg : color.badBg;
  const fg = tone === 'good' ? color.tealText : tone === 'warn' ? color.warn : color.bad;
  return <View style={[s.state, { backgroundColor: bg }]}><Icon name={icon} size={16} color={fg} /><Text style={s.stateT}>{children}</Text></View>;
}

/** İlan sayfasındaki açık artırma bölümü. */
export function AuctionBox({ auction: initial, own, signedIn, askLogin }: { auction: Auction; own: boolean; signedIn: boolean; askLogin: () => void }) {
  const [a, setA] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [bids, setBids] = useState<Bid[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const [det, setDet] = useState<Details | null>(null);
  const [amount, setAmount] = useState('');
  const [lower, setLower] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    const [au, h, st, d] = await Promise.all([
      supabase.from('auctions').select('id,listing_id,seller_id,start_price,min_increment,ends_at,status,current_price,bid_count').eq('id', initial.id).maybeSingle(),
      supabase.rpc('auction_bid_history', { p_auction: initial.id }),
      signedIn ? supabase.rpc('my_auction_status', { p_auction: initial.id }) : Promise.resolve({ data: null }),
      signedIn ? supabase.rpc('my_auction_details', { p_auction: initial.id }) : Promise.resolve({ data: null }),
    ]);
    if (au.data) setA(au.data as Auction);
    if (!h.error) setBids((h.data ?? []) as Bid[]);
    setMine((st.data as string | null) ?? null);
    setDet((d.data as Details | null) ?? null);
  }, [initial.id, signedIn]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(() => void refresh(), 15000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [refresh]);

  const live = a.status === 'active' && Date.parse(a.ends_at) > now;
  const min = nextMin(a);
  const left = Date.parse(a.ends_at) - now;
  const ending = live && left < HOUR;
  const canWithdraw = live && !!det?.my_bid && left > HOUR && (det?.withdrawals_left ?? 0) > 0;

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true); setErr('');
    const { error } = await fn();
    setBusy(false);
    if (error) { setErr(tr(errText(error.message))); void refresh(); return; }
    after?.();
    void refresh();
  }

  function bid() {
    if (!signedIn) { askLogin(); return; }
    const n = Number(amount.replace(/\./g, '').replace(',', '.')) || min;
    if (n < min) { setErr(`${tr('En az')} ${tl(min)}`); return; }
    Alert.alert(tr('Teklifi onayla'), `${tl(n)} ${tr('teklif vereceksin. Kazanırsan bu fiyattan satın almayı kabul etmiş olursun; ödemeyi yapmazsan premium üyeliğin iadesiz iptal edilir ve açık artırmalara bir daha katılamazsın. Bitime 1 saatten fazla varken teklifini geri çekebilirsin.')}`, [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Teklif ver'), onPress: () => void run(() => supabase.rpc('place_bid', { p_auction: a.id, p_amount: n }), () => setAmount('')) },
    ]);
  }

  function withdraw() {
    Alert.alert(tr('Teklifi geri çek'), tr('Teklifin geri çekilecek ve diğer teklif verenlere bildirim gidecek. Bu açık artırmada en fazla 2 kez geri çekme veya düşürme yapabilirsin.'), [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Geri çek'), style: 'destructive', onPress: () => void run(() => supabase.rpc('withdraw_bid', { p_auction: a.id, p_new_amount: null })) },
    ]);
  }

  function doLower() {
    const n = Number((lower ?? '').replace(/\./g, '').replace(',', '.'));
    if (!n) { setErr(tr('Yeni tutarı gir.')); return; }
    Alert.alert(tr('Teklifi düşür'), `${tr('Yeni teklifin')}: ${tl(n)}. ${tr('Diğer teklif verenlere bildirim gidecek.')}`, [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Düşür'), onPress: () => void run(() => supabase.rpc('withdraw_bid', { p_auction: a.id, p_new_amount: n }), () => setLower(null)) },
    ]);
  }

  function backOut() {
    Alert.alert(tr('Satın almaktan vazgeç'), tr('Vazgeçersen premium üyeliğin iade yapılmadan hemen iptal edilir, hesabın ve kullandığın internet bağlantısı açık artırmalardan men edilir. Makine sıradaki teklif verene teklif edilir. Emin misin?'), [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Evet, vazgeçiyorum'), style: 'destructive', onPress: () => void run(() => supabase.rpc('back_out_auction', { p_auction: a.id })) },
    ]);
  }

  function reportUnpaid() {
    Alert.alert(tr('Alıcı ödeme yapmadı'), tr('Bildirimin yönetici tarafından incelenir. Onaylanırsa alıcının premium üyeliği iadesiz iptal edilir ve makine sıradaki teklif verene 48 saatliğine teklif edilir. Yanlış bildirim hesabına yaptırım uygulanmasına yol açabilir.'), [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Bildir'), style: 'destructive', onPress: () => void run(() => supabase.rpc('report_unpaid', { p_auction: a.id })) },
    ]);
  }

  const offer = det?.offer;
  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={[s.badge, !live && { backgroundColor: color.plate }]}>
          <Icon name="award" size={13} color={live ? color.tealInk : color.muted} />
          <Text style={[s.badgeT, !live && { color: color.muted }]}>{live ? 'Açık artırma' : a.status === 'cancelled' ? 'İptal edildi' : 'Sona erdi'}</Text>
        </View>
        {live ? <View style={s.time}><Icon name="clock" size={14} color={ending ? color.bad : color.muted} /><PlainText style={[s.timeT, ending && { color: color.bad }]}>{timeLeft(a.ends_at, now)}</PlainText></View> : null}
      </View>

      <Text style={s.k}>{a.current_price == null ? 'Başlangıç fiyatı' : live ? 'Güncel teklif' : 'Son teklif'}</Text>
      <PlainText style={s.price}>{tl(a.current_price ?? a.start_price)}</PlainText>
      <PlainText style={s.meta}>{`${a.bid_count} ${tr('teklif')} · ${tr('Artış')} ${tl(a.min_increment)}`}</PlainText>

      {mine === 'leading' ? <Note icon="check-circle" tone="good">En yüksek teklif senin</Note> : null}
      {mine === 'outbid' && live ? <Note icon="alert-circle" tone="warn">Teklifin geçildi</Note> : null}
      {mine === 'won' ? <Note icon="award" tone="good">Açık artırmayı kazandın. Satıcıyla mesajlaşıp ödemeyi ayarla. Ödemeyi yapmazsan premium üyeliğin iadesiz iptal edilir.</Note> : null}
      {mine === 'unpaid' ? <Note icon="slash" tone="bad">Bu açık artırmadan vazgeçtiğin için premium üyeliğin iptal edildi ve açık artırmalara katılımın kapatıldı.</Note> : null}
      {det?.banned && mine !== 'unpaid' && live && !own ? <Note icon="slash" tone="bad">Daha önce kazandığın bir açık artırmadan vazgeçtiğin için açık artırmalara katılamazsın.</Note> : null}

      {mine === 'offer' && offer ? (
        <View style={s.offer}>
          <Text style={s.offerT}>Kazanan vazgeçti, sıra sana geldi</Text>
          <PlainText style={s.offerP}>{tl(offer.amount)}</PlainText>
          <PlainText style={s.meta}>{`${tr('Kabul etmek için kalan süre')}: ${timeLeft(offer.expires_at, now)}`}</PlainText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable style={[s.btn, { flex: 1 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => Alert.alert(tr('Teklifi kabul et'), `${tl(offer.amount)} ${tr('fiyattan satın almayı kabul ediyorsun. Ödemeyi yapmazsan premium üyeliğin iadesiz iptal edilir.')}`, [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr('Kabul et'), onPress: () => void run(() => supabase.rpc('respond_offer', { p_auction: a.id, p_accept: true })) }])} accessibilityRole="button">
              <Text style={s.btnT}>Kabul et</Text>
            </Pressable>
            <Pressable style={[s.ghost, { flex: 1, borderColor: color.line, marginTop: 0 }]} disabled={busy} onPress={() => void run(() => supabase.rpc('respond_offer', { p_auction: a.id, p_accept: false }))} accessibilityRole="button">
              <Text style={[s.ghostT, { color: color.ink }]}>Reddet</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {live && !own && !det?.banned ? (
        signedIn && det && !det.premium ? (
          <Pressable style={({ pressed }) => [s.premium, pressed && { opacity: 0.85 }]} onPress={() => router.push('/premium')} accessibilityRole="button">
            <Icon name="lock" size={18} color={color.tealInk} />
            <View style={{ flex: 1 }}>
              <Text style={s.premiumT}>Teklif vermek için Pro veya Firma Pro üyelik gerekir</Text>
              <Text style={s.premiumS}>Üyelikleri incele</Text>
            </View>
            <Icon name="chevron-right" size={18} color={color.tealInk} />
          </Pressable>
        ) : (
          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={s.bidRow}>
              <TextInput style={s.input} value={amount} onChangeText={(v) => { setAmount(v); setErr(''); }} keyboardType="number-pad" placeholder={`${tr('En az')} ${tl(min)}`} accessibilityLabel={tr('Teklif tutarı')} />
              <Pressable style={[s.btn, (busy || mine === 'leading') && { opacity: 0.6 }]} disabled={busy || mine === 'leading'} onPress={bid} accessibilityRole="button">
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
          </View>
        )
      ) : null}

      {live && det?.my_bid ? (
        canWithdraw ? (
          lower !== null ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={s.bidRow}>
                <TextInput style={s.input} value={lower} onChangeText={setLower} keyboardType="number-pad" placeholder={`${tr('Yeni tutar')} (< ${tl(det.my_bid)})`} autoFocus />
                <Pressable style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={doLower} accessibilityRole="button"><Text style={s.btnT}>Düşür</Text></Pressable>
              </View>
              <Pressable onPress={() => setLower(null)} accessibilityRole="button"><Text style={s.link}>Vazgeç</Text></Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable style={s.small} onPress={() => setLower('')} accessibilityRole="button"><Icon name="trending-down" size={15} color={color.ink} /><Text style={s.smallT}>Teklifimi düşür</Text></Pressable>
              <Pressable style={s.small} onPress={withdraw} accessibilityRole="button"><Icon name="corner-up-left" size={15} color={color.bad} /><Text style={[s.smallT, { color: color.bad }]}>Geri çek</Text></Pressable>
            </View>
          )
        ) : (
          <Text style={[s.meta, { marginTop: 8 }]}>{left <= HOUR ? 'Son 1 saatte teklif geri çekilemez veya düşürülemez.' : 'Bu açık artırmada geri çekme hakkını kullandın.'}</Text>
        )
      ) : null}

      {err ? <Text style={s.err}>{err}</Text> : null}

      {mine === 'won' && !live ? (
        <Pressable style={s.ghost} onPress={backOut} accessibilityRole="button"><Text style={s.ghostT}>Satın almaktan vazgeç</Text></Pressable>
      ) : null}

      {own && live ? (
        a.bid_count === 0
          ? <Pressable style={s.ghost} onPress={() => Alert.alert(tr('Açık artırma'), tr('Açık artırma iptal edilsin mi?'), [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr('İptal et'), style: 'destructive', onPress: () => void run(() => supabase.rpc('cancel_auction', { p_auction: a.id })) }])} accessibilityRole="button"><Text style={s.ghostT}>Açık artırmayı iptal et</Text></Pressable>
          : <Text style={[s.meta, { marginTop: 6 }]}>Teklif gelen açık artırma iptal edilemez. Süre bitince en yüksek teklifi verenle mesajlaşma otomatik açılır.</Text>
      ) : null}

      {own && !live && det?.seller ? (
        <View style={{ gap: 6, marginTop: 6 }}>
          {det.seller.unpaid_status === 'pending' ? <Note icon="clock" tone="warn">Ödeme bildirimin yönetici tarafından inceleniyor.</Note> : null}
          {det.seller.offer_pending ? <Note icon="send" tone="good">Sıradaki teklif verene 48 saatlik teklif gönderildi.</Note> : null}
          {det.seller.can_report ? (
            <Pressable style={s.ghost} onPress={reportUnpaid} accessibilityRole="button"><Text style={s.ghostT}>Alıcı ödeme yapmadı</Text></Pressable>
          ) : null}
        </View>
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
      {live ? <Text style={s.note}>Yalnızca Pro ve Firma Pro üyeler teklif verebilir. Son 5 dakikada gelen her teklif süreyi 5 dakika uzatır. Bitime 1 saatten fazla varken teklif geri çekilebilir veya düşürülebilir. Teklif verenlerin adı gizlidir.</Text> : null}
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
  stateT: { color: color.ink, fontFamily: font.semi, fontSize: 14, flex: 1, lineHeight: 19 },
  offer: { marginTop: 8, padding: 12, borderRadius: radius, backgroundColor: color.tealSoft, gap: 2 },
  offerT: { color: color.ink, fontFamily: font.bold, fontSize: 15 },
  offerP: { color: color.tealText, fontFamily: font.bold, fontSize: 24 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.teal, marginTop: 6 },
  premiumT: { color: color.tealInk, fontFamily: font.bold, fontSize: 14.5 },
  premiumS: { color: color.tealInk, fontSize: 13, opacity: 0.9 },
  bidRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, fontSize: 16, color: color.ink, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  btn: { minHeight: 50, paddingHorizontal: 18, borderRadius: radius, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  quick: { flex: 1, minHeight: 38, borderRadius: radius, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  quickT: { color: color.ink, fontFamily: font.semi, fontSize: 13 },
  small: { flex: 1, flexDirection: 'row', gap: 6, minHeight: 42, borderRadius: radius, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  smallT: { color: color.ink, fontFamily: font.semi, fontSize: 14 },
  link: { color: color.tealText, fontFamily: font.semi, fontSize: 14, textAlign: 'center' },
  err: { color: color.bad, fontSize: 13.5, marginTop: 4 },
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
