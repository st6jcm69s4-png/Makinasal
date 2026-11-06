import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, Icon, type IconName } from '../../components/Icon';
import { AlertBox } from '../../components/kit';
import { checkMessage } from '../../lib/messageFilter';
import { PickerModal } from '../../components/PickerModal';
import { useApp } from '../../lib/AppContext';
import { useLoginPrompt } from '../../components/LoginPrompt';
import { SITE_URL, photoUrl, supabase, tl } from '../../lib/supabase';
import { trustLevel, type TrustLevel } from '../../lib/trust';
import { color, font, radius, shadow } from '../../lib/theme';

type Detail = {
  id: string; seller_id: string; category: string; title: string; description: string | null; price: number | string; city: string; year: number | null;
  usage_value: number | null; usage_unit: string | null; brand: string | null; model: string | null;
  listing_photos: { path: string; position: number }[] | null;
};
const REPORT_REASONS = ['Sahte veya yanıltıcı ilan', 'Kapora / ön ödeme istiyor', 'Fiyat gerçek dışı', 'Hakaret veya taciz', 'Diğer'];
const SERVICES: { id: string; label: string; icon: IconName; machineOnly: boolean }[] = [
  { id: 'finans', label: 'Finansman teklifi iste', icon: 'credit-card', machineOnly: true },
  { id: 'ekspertiz', label: 'Ekspertiz talep et', icon: 'clipboard', machineOnly: true },
  { id: 'nakliye', label: 'Nakliye teklifi iste', icon: 'truck', machineOnly: false },
];
const W = Dimensions.get('window').width;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { favs, toggleFav, session, cmp, toggleCmp } = useApp();
  const { askLogin, notify } = useLoginPrompt();
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmt, setOfferAmt] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerTakas, setOfferTakas] = useState(false);
  const [offerErr, setOfferErr] = useState('');
  const [item, setItem] = useState<Detail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'missing'>('loading');
  const [trust, setTrust] = useState<TrustLevel | null>(null);
  const [seller, setSeller] = useState('');
  const [phone, setPhone] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [service, setService] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [svcBusy, setSvcBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let alive = true;
    supabase.from('listings')
      .select('id,seller_id,category,title,description,price,city,year,usage_value,usage_unit,brand,model,listing_photos(path,position)')
      .eq('id', id).eq('status', 'active').eq('moderation_status', 'approved').maybeSingle()
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (error) { setState('error'); return; }
        if (!data) { setState('missing'); return; }
        setItem(data as Detail); setState('ok');
        void supabase.rpc('track_view', { p_listing: id });
        const sid = (data as Detail).seller_id;
        const [st, pr] = await Promise.all([
          supabase.from('user_stats').select('score,review_count,deals,reports').eq('id', sid).maybeSingle(),
          supabase.from('profiles').select('full_name,store_name,is_store').eq('id', sid).maybeSingle(),
        ]);
        if (!alive) return;
        const r = st.data as { score: number; review_count: number; deals: number; reports: number } | null;
        setTrust(trustLevel({ rep: Number(r?.reports ?? 0), deals: Number(r?.deals ?? 0), s: r && Number(r.review_count) > 0 ? Number(r.score) : null }));
        const p = pr.data as { full_name: string | null; store_name: string | null; is_store: boolean | null } | null;
        setSeller((p?.is_store && p.store_name) || p?.full_name || '');
      });
    return () => { alive = false; };
  }, [id]);

  const needLogin = (what: string) => askLogin(`${what} için giriş yapman gerekir.`);

  async function startThread(listingId: string, sellerId: string) {
    if (!session) return needLogin('Mesaj');
    setMsgBusy(true);
    const me = session.user.id;
    const found = await supabase.from('threads').select('id').eq('listing_id', listingId).eq('buyer_id', me).maybeSingle();
    let tid = (found.data as { id: string } | null)?.id;
    if (!tid) {
      const created = await supabase.from('threads').insert({ listing_id: listingId, buyer_id: me, seller_id: sellerId }).select('id').single();
      tid = (created.data as { id: string } | null)?.id;
      if (created.error || !tid) { setMsgBusy(false); Alert.alert('Mesaj', 'Konuşma başlatılamadı. Bağlantını kontrol et.'); return; }
    }
    setMsgBusy(false);
    router.push(`/mesaj/${tid}`);
  }

  async function sendOffer() {
    if (!session || !item) return;
    const n = Number(offerAmt.replace(/\./g, '').replace(',', '.'));
    if (!n || n < 1) { setOfferErr('Teklif tutarını gir.'); return; }
    const part = item.category === 'Yedek parça' || item.category === 'Lastik ve jant';
    const body = `Teklifim: ${tl(n)}${part ? ' (birim fiyat)' : ''}${offerTakas ? ', takas da olabilir' : ''}.${offerNote.trim() ? ' ' + offerNote.trim() : ''}`;
    const chk = checkMessage(body);
    if (chk.block) { setOfferErr(chk.block); return; }
    setMsgBusy(true); setOfferErr('');
    const me = session.user.id;
    const found = await supabase.from('threads').select('id').eq('listing_id', item.id).eq('buyer_id', me).maybeSingle();
    let tid = (found.data as { id: string } | null)?.id;
    if (!tid) {
      const created = await supabase.from('threads').insert({ listing_id: item.id, buyer_id: me, seller_id: item.seller_id }).select('id').single();
      tid = (created.data as { id: string } | null)?.id;
    }
    if (!tid) { setMsgBusy(false); setOfferErr('Konuşma başlatılamadı. Bağlantını kontrol et.'); return; }
    let res = await supabase.from('messages').insert({ thread_id: tid, sender_id: me, body, kind: 'offer', offer_amount: n });
    if (res.error && /kind|offer_amount/.test(res.error.message)) res = await supabase.from('messages').insert({ thread_id: tid, sender_id: me, body });
    setMsgBusy(false);
    if (res.error) { setOfferErr(res.error.message.includes('MESSAGE_PROFANITY') ? 'Küfür veya hakaret içeren mesaj gönderilemez.' : /RATE_LIMIT/.test(res.error.message) ? 'Çok fazla işlem. Bir dakika sonra tekrar dene.' : 'Teklif gönderilemedi. Tekrar dene.'); return; }
    setOfferOpen(false); setOfferAmt(''); setOfferNote('');
    router.push(`/mesaj/${tid}`);
  }

  async function showPhone() {
    if (!session) return needLogin('Telefon');
    const { data, error } = await supabase.rpc('listing_phone', { p_listing: id });
    if (error || !data) { Alert.alert('Telefon', 'Satıcı telefon numarasını paylaşmıyor ya da numara şu an alınamadı.'); return; }
    setPhone(String(data));
  }

  async function report(reason: string) {
    if (!session) return needLogin('Şikayet');
    const { error } = await supabase.from('reports').insert({ reporter_id: session.user.id, listing_id: id, reason });
    if (error) Alert.alert('Şikayet', /duplicate|unique/i.test(error.message) ? 'Bu ilanı zaten şikayet ettin.' : 'Şikayet gönderilemedi. Daha sonra tekrar dene.');
    else Alert.alert('Şikayet', 'Şikayet alındı. Moderatörler inceleyecek.');
  }

  async function sendService() {
    if (!session || !item || !service) return;
    setSvcBusy(true);
    const { error } = await supabase.from('service_requests').insert({ listing_id: item.id, kind: service, note: note.trim() || null, city: item.city });
    setSvcBusy(false);
    if (error) { Alert.alert('Talep', /duplicate|unique/i.test(error.message) ? 'Bu talebi zaten gönderdin.' : /RATE_LIMIT/.test(error.message) ? 'Çok fazla işlem. Bir dakika sonra tekrar dene.' : 'Talep gönderilemedi. Daha sonra tekrar dene.'); return; }
    setService(null); setNote('');
    Alert.alert('Talep', 'Talebin alındı. Makinasal ekibi seninle iletişime geçecek.');
  }

  if (state === 'loading') return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={color.teal} /></View>;
  if (state !== 'ok' || !item) return <View style={s.screen}><Text style={s.msg}>{state === 'missing' ? 'İlan bulunamadı veya yayından kalktı.' : 'İlan yüklenemedi.'}</Text></View>;
  const photos = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position);
  const own = session?.user.id === item.seller_id;
  const part = item.category === 'Yedek parça' || item.category === 'Lastik ve jant';
  const fav = favs.has(item.id);
  const inCmp = cmp.includes(item.id);
  const specs: [string, string | number | null][] = [
    ['Marka', item.brand], ['Model', item.model], ['Yıl', item.year],
    ['Kullanım', item.usage_value ? `${item.usage_value} ${item.usage_unit ?? ''}`.trim() : null],
    ['İl', item.city], ['Kategori', item.category],
  ];
  const chips: [IconName, string][] = ([['map-pin', item.city], ['calendar', item.year ? String(item.year) : ''], ['activity', item.usage_value ? `${item.usage_value} ${item.usage_unit ?? ''}`.trim() : '']] as [IconName, string][]).filter(([, v]) => !!v);
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: own ? 32 : 120 }}>
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / W))}>
            {photos.length ? photos.map((p) => <Image key={p.path} source={{ uri: photoUrl(p.path) }} style={s.photo} />) : <View style={[s.photo, s.noPhoto]}><Icon name="truck" size={48} color={color.muted} /></View>}
          </ScrollView>
          {photos.length > 1 ? <View style={s.counter}><PlainText style={s.counterT}>{`${slide + 1} / ${photos.length}`}</PlainText></View> : null}
          <View style={s.overlay}>
            <Pressable style={s.round} accessibilityRole="button" accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'} onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) notify('Favoriler', err, (a) => void a.toggleFav(item.id, item.price)); }}>
              <Heart on={fav} size={22} color={fav ? '#E5484D' : '#2A2620'} />
            </Pressable>
            <Pressable style={[s.round, inCmp && { backgroundColor: color.teal }]} accessibilityRole="button" accessibilityLabel={inCmp ? 'Karşılaştırmada' : 'Karşılaştırmaya ekle'} onPress={() => { const err = toggleCmp(item.id); if (err) Alert.alert('Karşılaştır', err); }}>
              <Icon name="repeat" size={19} color={inCmp ? color.tealInk : '#2A2620'} />
            </Pressable>
          </View>
        </View>

        <View style={s.head}>
          <Text style={s.title}>{item.title}</Text>
          <PlainText style={s.price}>{tl(item.price)}{part ? <Text style={s.unit}> (birim fiyat)</Text> : null}</PlainText>
          {chips.length ? (
            <View style={s.chips}>
              {chips.map(([ic, v]) => <View key={ic} style={s.chip}><Icon name={ic} size={14} color={color.tealText} /><PlainText style={s.chipT}>{v}</PlainText></View>)}
            </View>
          ) : null}
          {cmp.length >= 2 ? (
            <Pressable style={s.cmpLink} onPress={() => router.push('/karsilastir')} accessibilityRole="button">
              <Icon name="columns" size={16} color={color.tealText} /><Text style={s.linkT}>Karşılaştırmayı aç ({cmp.length})</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={s.h2}>Teknik bilgiler</Text>
        <View style={s.card}>
          {specs.map(([k, v], i) => (
            <View key={k} style={[s.specRow, i > 0 && s.sep]}>
              <Text style={s.specK}>{k}</Text>
              <PlainText style={s.specV} numberOfLines={2}>{v === null || v === '' ? '—' : String(v)}</PlainText>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Satıcı</Text>
        <Pressable style={({ pressed }) => [s.card, s.seller, pressed && { opacity: 0.88 }]} onPress={() => router.push(`/magaza/${item.seller_id}`)} accessibilityRole="button">
          <View style={s.avatar}><PlainText style={s.avatarT}>{(seller || '?').trim().charAt(0).toLocaleUpperCase('tr-TR')}</PlainText></View>
          <View style={{ flex: 1, gap: 3 }}>
            <PlainText style={s.sellerName} numberOfLines={1}>{seller || '—'}</PlainText>
            {trust ? <View style={[s.trust, { borderColor: trust.color }]}><Text style={[s.trustT, { color: trust.color }]}>{trust.label}</Text></View> : null}
            <Text style={s.linkT}>Satıcının profili ve ilanları</Text>
          </View>
          <Icon name="chevron-right" size={20} color={color.muted} />
        </Pressable>

        {item.description ? (
          <>
            <Text style={s.h2}>Açıklama</Text>
            <View style={s.card}><Text style={s.desc}>{item.description}</Text></View>
          </>
        ) : null}

        <View style={{ marginHorizontal: 16, marginTop: 16 }}><AlertBox variant="warning">Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermeyin.</AlertBox></View>

        {!own ? (
          <>
            <Text style={s.h2}>Ek hizmetler</Text>
            <View style={s.card}>
              {SERVICES.filter((x) => !part || !x.machineOnly).map((x, i) => (
                <Pressable key={x.id} style={({ pressed }) => [s.svc, i > 0 && s.sep, pressed && { opacity: 0.8 }]} onPress={() => (session ? setService(x.id) : needLogin('Talep'))} accessibilityRole="button">
                  <View style={s.svcIcon}><Icon name={x.icon} size={18} color={color.tealText} /></View>
                  <Text style={s.svcT}>{x.label}</Text>
                  <Icon name="chevron-right" size={18} color={color.muted} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setReportOpen(true)} accessibilityRole="button" style={s.reportBtn}>
              <Icon name="flag" size={15} color={color.muted} /><Text style={s.report}>İlanı şikayet et</Text>
            </Pressable>
          </>
        ) : null}
        {SITE_URL && own ? (
          <Pressable style={[s.ghost, { marginHorizontal: 16, marginTop: 16 }]} onPress={() => void Linking.openURL(`${SITE_URL}/ilanlar/${item.id}`)} accessibilityRole="button">
            <Text style={s.ghostT}>Web sitesinde aç</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {!own ? (
        <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={s.barIcon} onPress={() => (phone ? void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`) : void showPhone())} accessibilityRole="button" accessibilityLabel={phone ? phone : 'Telefonu göster'}>
            <Icon name="phone" size={20} color={color.tealText} />
          </Pressable>
          {phone ? <PlainText style={s.phone} selectable numberOfLines={1}>{phone}</PlainText> : (
            <Pressable style={[s.ghost, { flex: 1 }]} onPress={() => (session ? setOfferOpen(true) : needLogin('Teklif'))} accessibilityRole="button"><Text style={s.ghostT}>Teklif ver</Text></Pressable>
          )}
          <Pressable style={[s.primary, { flex: 1.2 }, msgBusy && { opacity: 0.6 }]} disabled={msgBusy} onPress={() => void startThread(item.id, item.seller_id)} accessibilityRole="button">
            <Icon name="message-circle" size={18} color={color.tealInk} /><Text style={s.primaryT}>Mesaj gönder</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={offerOpen} transparent animationType="slide" onRequestClose={() => setOfferOpen(false)}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOfferOpen(false)} accessibilityRole="button" accessibilityLabel="Kapat" />
          <View style={s.sheet}>
            <View style={s.grab} />
            <Text style={s.sheetT}>Teklif ver</Text>
            <TextInput style={s.field} value={offerAmt} onChangeText={setOfferAmt} placeholder={`Teklifin (₺${part ? ', birim fiyat' : ''})`} keyboardType="decimal-pad" />
            <TextInput style={[s.field, { minHeight: 80, textAlignVertical: 'top' }]} value={offerNote} onChangeText={setOfferNote} placeholder="Not (isteğe bağlı)" maxLength={300} multiline />
            <View style={s.switchRow}><Text style={{ flex: 1, color: color.ink, fontSize: 15 }}>Takas da olabilir</Text><Switch value={offerTakas} onValueChange={setOfferTakas} trackColor={{ true: color.teal, false: color.plate }} /></View>
            {offerErr ? <Text style={{ color: color.bad }}>{offerErr}</Text> : null}
            <Text style={s.small}>Ürünü görmeden kapora, ön ödeme, havale veya EFT göndermeyin.</Text>
            <Pressable style={[s.primary, msgBusy && { opacity: 0.6 }]} disabled={msgBusy} onPress={() => void sendOffer()} accessibilityRole="button"><Text style={s.primaryT}>Teklifi gönder</Text></Pressable>
            <Pressable style={s.cancel} onPress={() => setOfferOpen(false)} accessibilityRole="button"><Text style={s.cancelT}>Vazgeç</Text></Pressable>
          </View>
        </View>
      </Modal>
      <PickerModal visible={reportOpen} title="Şikayet nedeni" options={REPORT_REASONS.map((r) => ({ value: r, label: r }))} onPick={(r) => void report(r)} onClose={() => setReportOpen(false)} />
      <Modal visible={!!service} transparent animationType="slide" onRequestClose={() => setService(null)}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setService(null)} accessibilityRole="button" accessibilityLabel="Kapat" />
          <View style={s.sheet}>
            <View style={s.grab} />
            <Text style={s.sheetT}>{SERVICES.find((x) => x.id === service)?.label ?? ''}</Text>
            <TextInput style={[s.field, { minHeight: 90, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} placeholder="Not (isteğe bağlı)" multiline maxLength={500} />
            <Text style={s.small}>Talebin yalnızca Makinasal ekibine iletilir; henüz anlaşmalı bir firma yoktur, ekip seninle profilindeki iletişim bilgisiyle görüşür. Bu bir teklif veya taahhüt değildir.</Text>
            <Pressable style={[s.primary, svcBusy && { opacity: 0.6 }]} disabled={svcBusy} onPress={() => void sendService()} accessibilityRole="button"><Text style={s.primaryT}>Talebi gönder</Text></Pressable>
            <Pressable style={s.cancel} onPress={() => setService(null)} accessibilityRole="button"><Text style={s.cancelT}>Vazgeç</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  photo: { width: W, height: 290, backgroundColor: color.plate },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  counterT: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  overlay: { position: 'absolute', top: 12, right: 12, gap: 10 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  head: { backgroundColor: color.surface, marginTop: -18, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 8 },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: color.ink },
  price: { fontFamily: font.bold, fontSize: 27, color: color.tealText },
  unit: { fontSize: 14, fontFamily: font.medium, color: color.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: color.tealSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipT: { color: color.ink, fontSize: 13.5, fontWeight: '600' },
  cmpLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  linkT: { color: color.tealText, fontFamily: font.semi, fontSize: 14.5 },
  h2: { fontFamily: font.bold, fontSize: 18, color: color.ink, marginHorizontal: 16, marginTop: 22, marginBottom: 10 },
  card: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, paddingHorizontal: 14, ...shadow },
  sep: { borderTopWidth: 1, borderTopColor: color.line },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  specK: { color: color.muted, fontSize: 14.5 },
  specV: { color: color.ink, fontFamily: font.semi, fontSize: 14.5, flexShrink: 1, textAlign: 'right' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: color.tealInk, fontFamily: font.bold, fontSize: 20 },
  sellerName: { color: color.ink, fontFamily: font.bold, fontSize: 16 },
  trust: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  trustT: { fontSize: 12, fontWeight: '700' },
  desc: { color: color.ink, fontSize: 15.5, lineHeight: 23, paddingVertical: 14 },
  svc: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  svcIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  svcT: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 15 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, marginTop: 4 },
  report: { color: color.muted, fontSize: 14 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.line },
  barIcon: { width: 50, height: 50, borderRadius: radius, borderWidth: 1.5, borderColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  phone: { flex: 1, color: color.ink, fontFamily: font.bold, fontSize: 16 },
  primary: { flexDirection: 'row', gap: 8, backgroundColor: color.teal, minHeight: 50, borderRadius: radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  ghost: { minHeight: 50, borderRadius: radius, borderWidth: 1.5, borderColor: color.teal, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ghostT: { color: color.tealText, fontFamily: font.bold, fontSize: 15.5 },
  msg: { margin: 24, textAlign: 'center', color: color.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 34, gap: 12, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.line, marginBottom: 4 },
  sheetT: { fontFamily: font.bold, fontSize: 19, color: color.ink },
  field: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  small: { color: color.muted, fontSize: 12.5, lineHeight: 18 },
  cancel: { minHeight: 48, borderRadius: radius, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' },
  cancelT: { color: color.ink, fontFamily: font.semi, fontSize: 15.5 },
});
