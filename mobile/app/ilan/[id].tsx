import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { useApp } from '../../lib/AppContext';
import { SITE_URL, photoUrl, supabase, tl } from '../../lib/supabase';
import { trustLevel, type TrustLevel } from '../../lib/trust';

type Detail = {
  id: string; seller_id: string; category: string; title: string; description: string | null; price: number | string; city: string; year: number | null;
  usage_value: number | null; usage_unit: string | null; brand: string | null; model: string | null;
  listing_photos: { path: string; position: number }[] | null;
};
const REPORT_REASONS = ['Sahte veya yanıltıcı ilan', 'Kapora / ön ödeme istiyor', 'Fiyat gerçek dışı', 'Hakaret veya taciz', 'Diğer'];
const SERVICES = [
  { id: 'finans', label: 'Finansman teklifi iste', machineOnly: true },
  { id: 'ekspertiz', label: 'Ekspertiz talep et', machineOnly: true },
  { id: 'nakliye', label: 'Nakliye teklifi iste', machineOnly: false },
];

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { favs, toggleFav, session } = useApp();
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

  const needLogin = (what: string) => Alert.alert(what, 'Bu işlem için giriş yapmalısın.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Giriş yap', onPress: () => router.push('/hesap') }]);

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

  if (state === 'loading') return <ActivityIndicator style={{ margin: 32 }} />;
  if (state !== 'ok' || !item) return <Text style={s.msg}>{state === 'missing' ? 'İlan bulunamadı veya yayından kalktı.' : 'İlan yüklenemedi.'}</Text>;
  const photos = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position);
  const own = session?.user.id === item.seller_id;
  const part = item.category === 'Yedek parça' || item.category === 'Lastik ve jant';
  return (
    <ScrollView style={{ backgroundColor: '#fff' }}>
      <ScrollView horizontal pagingEnabled>
        {photos.length ? photos.map((p) => <Image key={p.path} source={{ uri: photoUrl(p.path) }} style={s.photo} />) : <View style={[s.photo, { backgroundColor: '#e3e3e6' }]} />}
      </ScrollView>
      <View style={s.body}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.price}>{tl(item.price)}</Text>
        <Pressable style={s.favBtn} accessibilityRole="button" onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) Alert.alert('Favoriler', err); }}>
          <Text style={s.favText}>{favs.has(item.id) ? '♥ Favorilerde' : '♡ Favorilere ekle'}</Text>
        </Pressable>
        <Text style={s.meta}>
          {[item.brand, item.model, item.city, item.year, item.usage_value ? `${item.usage_value} ${item.usage_unit ?? ''}` : null].filter(Boolean).join(' · ')}
        </Text>
        {trust ? (
          <Text style={s.meta}>Satıcı: {seller || '—'} · <Text style={{ color: trust.color, fontWeight: '700' }}>{trust.label}</Text></Text>
        ) : null}
        {item.description ? <Text style={s.desc}>{item.description}</Text> : null}
        <Text style={s.warn}>Ürünü görmeden kapora, ön ödeme, havale ya da EFT göndermeyin.</Text>

        {!own ? (
          <>
            {phone ? <Text style={s.phone} selectable>{phone}</Text> : (
              <Pressable style={s.btnGhost} onPress={() => void showPhone()} accessibilityRole="button"><Text style={s.btnGhostText}>Telefonu göster</Text></Pressable>
            )}
            <Pressable style={s.btn} disabled={msgBusy} onPress={() => void startThread(item.id, item.seller_id)} accessibilityRole="button">
              <Text style={s.btnText}>Mesaj gönder</Text>
            </Pressable>
            <Text style={s.section}>Ek hizmetler</Text>
            {SERVICES.filter((x) => !part || !x.machineOnly).map((x) => (
              <Pressable key={x.id} style={s.btnGhost} onPress={() => (session ? setService(x.id) : needLogin('Talep'))} accessibilityRole="button">
                <Text style={s.btnGhostText}>{x.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setReportOpen(true)} accessibilityRole="button"><Text style={s.report}>İlanı şikayet et</Text></Pressable>
          </>
        ) : null}
        {SITE_URL ? (
          <Pressable style={s.btnGhost} onPress={() => void Linking.openURL(`${SITE_URL}/ilanlar/${item.id}`)} accessibilityRole="button">
            <Text style={s.btnGhostText}>Teklif için web sitesinde aç</Text>
          </Pressable>
        ) : null}
      </View>

      <PickerModal visible={reportOpen} title="Şikayet nedeni" options={REPORT_REASONS.map((r) => ({ value: r, label: r }))} onPick={(r) => void report(r)} onClose={() => setReportOpen(false)} />
      <Modal visible={!!service} transparent animationType="slide" onRequestClose={() => setService(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.section}>{SERVICES.find((x) => x.id === service)?.label}</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Not (isteğe bağlı)" multiline maxLength={500} />
            <Text style={s.small}>Talebin yalnızca Makinasal ekibine iletilir; henüz anlaşmalı bir firma yoktur, ekip seninle profilindeki iletişim bilgisiyle görüşür. Bu bir teklif veya taahhüt değildir.</Text>
            <Pressable style={s.btn} disabled={svcBusy} onPress={() => void sendService()} accessibilityRole="button"><Text style={s.btnText}>Talebi gönder</Text></Pressable>
            <Pressable onPress={() => setService(null)} accessibilityRole="button"><Text style={s.report}>Vazgeç</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  photo: { width: 390, height: 260 },
  body: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#25272D' },
  price: { fontSize: 20, fontWeight: '700', color: '#6B1E2E' },
  meta: { color: '#666' },
  desc: { marginTop: 4, lineHeight: 20 },
  warn: { color: '#b36b00', backgroundColor: '#fff6e5', padding: 10, borderRadius: 8 },
  favBtn: { alignSelf: 'flex-start', paddingVertical: 2 },
  favText: { color: '#6B1E2E', fontWeight: '600' },
  btn: { backgroundColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#6B1E2E', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#6B1E2E', fontWeight: '600' },
  phone: { fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 8 },
  section: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  report: { color: '#888', textAlign: 'center', padding: 10, textDecorationLine: 'underline' },
  msg: { margin: 24, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, gap: 10, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  input: { minHeight: 80, padding: 10, backgroundColor: '#F5F5F6', borderRadius: 8, textAlignVertical: 'top' },
  small: { color: '#666', fontSize: 12 },
});
