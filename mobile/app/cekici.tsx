import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { PickerModal } from '../components/PickerModal';
import { Btn } from '../components/ui';
import { Group } from '../components/Rows';
import { tr } from '../lib/i18n';
import { AlertBox, RowSkeleton } from '../components/kit';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from '../components/LoginPrompt';
import { CITIES } from '../lib/data';
import { COORDS } from '../lib/geo';
import { color, font } from '../lib/theme';
import type { Provider } from '../lib/network';
import { supabase } from '../lib/supabase';

type Tow = Provider & { lat: number | null; lng: number | null };
type Stat = { score: number; review_count: number };
type Pos = { lat: number; lng: number };

const km = (a: Pos, b: Pos) => {
  const d = Math.PI / 180, dLat = (b.lat - a.lat) * d, dLng = (b.lng - a.lng) * d;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const cityPos = (c: string): Pos | null => (COORDS[c] ? { lat: COORDS[c][0], lng: COORDS[c][1] } : null);

export default function Cekici() {
  const { session } = useApp();
  const { askLogin } = useLoginPrompt();
  const [rows, setRows] = useState<Tow[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [gps, setGps] = useState<Pos | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [phones, setPhones] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError('');
    const r = await supabase.from('service_providers').select('*').eq('published', true).eq('kind', 'tow').limit(300);
    if (r.error) { setError('Çekiciler yüklenemedi. Bağlantını kontrol et.'); setRows([]); return; }
    const list = (r.data ?? []) as Tow[];
    setRows(list);
    if (list.length) {
      const st = await supabase.from('user_stats').select('id,score,review_count').in('id', list.map((x) => x.user_id));
      const m: Record<string, Stat> = {};
      for (const x of (st.data ?? []) as { id: string; score: number | string; review_count: number | string }[]) m[x.id] = { score: Number(x.score), review_count: Number(x.review_count) };
      setStats(m);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // Üyenin kayıtlı ili varsa başlangıç konumu olarak kullanılır.
  useEffect(() => {
    if (!session) return;
    void supabase.from('profiles').select('city').eq('id', session.user.id).maybeSingle().then((r) => {
      const c = (r.data as { city?: string | null } | null)?.city;
      if (c) setCity((cur) => cur || c);
    });
  }, [session]);

  async function useMyLocation() {
    setLocBusy(true);
    try {
      const Loc = await import('expo-location');
      const perm = await Loc.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Konum', 'Konum izni verilmedi. İlini listeden seçebilirsin.'); return; }
      const p = await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Balanced });
      setGps({ lat: p.coords.latitude, lng: p.coords.longitude });
      setCity('');
    } catch {
      Alert.alert('Konum', 'Konum alınamadı. İlini listeden seçebilirsin.');
    } finally { setLocBusy(false); }
  }

  const origin: Pos | null = gps ?? (city ? cityPos(city) : null);
  const sorted = useMemo(() => {
    const list = (rows ?? []).map((t) => {
      const at: Pos | null = t.lat != null && t.lng != null ? { lat: t.lat, lng: t.lng } : cityPos(t.city);
      const d = origin && at ? Math.round(km(origin, at)) : null;
      const serves = !!city && (t.service_cities.includes(city) || t.city === city);
      return { t, d, serves };
    });
    return list.sort((a, b) => (a.d ?? 99999) - (b.d ?? 99999));
  }, [rows, origin, city]);

  async function call(id: string) {
    if (!session) { askLogin('Çekicinin telefon numarasını görmek için giriş yapman gerekir.'); return; }
    let ph = phones[id];
    if (!ph) {
      const { data, error: e } = await supabase.rpc('provider_phone', { p_provider: id });
      if (e || !data) { Alert.alert('Telefon', 'Bu çekici telefon numarasını paylaşmıyor. Firma sayfasından iletişim kurabilirsin.'); return; }
      ph = String(data); setPhones((c) => ({ ...c, [id]: ph }));
    }
    void Linking.openURL(`tel:${ph.replace(/[^\d+]/g, '')}`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={s.body}>
      {/* Acil durum: ekranın en üstünde, kendi kartında; tek dokunuşla 112 */}
      <View style={s.sos}>
        <View style={s.sosIcon}><Icon name="alert-triangle" size={18} color="#FFFFFF" /></View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.sosT}>Can güvenliği tehlikedeyse</Text>
          <Text style={s.sosS}>Çekiciden önce 112'yi ara.</Text>
        </View>
        <Pressable style={({ pressed }) => [s.sosBtn, pressed && { opacity: 0.6 }]} onPress={() => void Linking.openURL('tel:112')} accessibilityRole="button" accessibilityLabel={tr("112'yi ara")}>
          <Icon name="phone" size={15} color={color.bad} />
          <PlainText style={s.sosBtnT}>112</PlainText>
        </Pressable>
      </View>

      <Group
        title="Nerede olduğunu seç"
        footer="Çekiciler yakınlığa göre, puanlarıyla sıralanır."
        items={[
          { icon: 'crosshair', tint: 'accent', label: gps ? 'Konumum kullanılıyor' : 'Konumumu kullan', sub: locBusy ? 'Konum alınıyor…' : gps ? 'Yenilemek için dokun' : undefined, go: () => { if (!locBusy) void useMyLocation(); } },
          { icon: 'map-pin', tint: 'green', label: 'İl seç', value: gps ? undefined : city || undefined, go: () => setSheet(true) },
        ]}
      />

      {rows === null ? <RowSkeleton count={4} /> : null}
      {error ? <AlertBox variant="destructive">{error}</AlertBox> : null}
      {rows && !rows.length && !error ? (
        <View style={s.empty}>
          <Text style={s.emptyT}>Henüz kayıtlı çekici yok.</Text>
          <Text style={s.emptyS}>Çekici hizmeti veriyorsan firma profilini "Çekici / yol yardım" türüyle oluştur, burada ilk sen görün.</Text>
          <Btn title="Firma profili oluştur" onPress={() => router.push('/ag/firma-kaydi')} />
        </View>
      ) : null}
      {!origin && rows?.length ? <Text style={s.hint}>Mesafeyi görmek için konumunu kullan ya da il seç.</Text> : null}

      {sorted.length ? <Text style={s.secT} accessibilityRole="header">Çekiciler</Text> : null}
      {sorted.map(({ t, d, serves }) => {
        const st = stats[t.user_id];
        return (
          <View key={t.user_id} style={s.card}>
            <Pressable onPress={() => router.push(`/firma/${t.user_id}` as never)} accessibilityRole="button" style={({ pressed }) => [s.cardTop, pressed && { backgroundColor: color.plate }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.name} numberOfLines={2}>{t.name}</Text>
                <Text style={s.where}>{[t.city, t.district].filter(Boolean).join(' / ')}</Text>
                <View style={s.meta}>
                  <Icon name="star" size={13} color={st && st.review_count ? '#C99A06' : color.muted} />
                  <Text style={s.metaT}>{st && st.review_count ? `${st.score.toFixed(1)} (${st.review_count})` : 'Yeni'}</Text>
                  <Text style={s.metaT}>·</Text>
                  <Text style={s.metaT} numberOfLines={1}>{serves ? 'Bölgende hizmet veriyor' : `${t.service_cities.length} il`}</Text>
                </View>
              </View>
              <View style={s.dist}>
                <PlainText style={s.distNum}>{d == null ? '–' : String(d)}</PlainText>
                <Text style={s.distUnit}>km</Text>
              </View>
            </Pressable>
            <View style={s.actions}>
              <Pressable style={({ pressed }) => [s.call, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} onPress={() => void call(t.user_id)} accessibilityRole="button">
                <Icon name="phone" size={17} color={color.accentInk} /><Text style={s.callText}>Ara</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [s.more, pressed && { opacity: 0.7 }]} onPress={() => router.push(`/firma/${t.user_id}` as never)} accessibilityRole="button">
                <Text style={s.moreText}>Firma sayfası</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <PickerModal visible={sheet} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(c) => { setCity(c); setGps(null); }} onClose={() => setSheet(false)} />
    </ScrollView>
  );
}

/* Apple gruplu liste düzeni: gölgesiz, çerçevesiz kartlar; kırmızı yalnızca acil durumda. */
const HAIR = StyleSheet.hairlineWidth;
const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40, gap: 18 },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: 16, padding: 12 },
  sosIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: color.bad, alignItems: 'center', justifyContent: 'center' },
  sosT: { color: color.ink, fontFamily: font.semi, fontSize: 15.5 },
  sosS: { color: color.muted, fontSize: 13.5 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: color.badBg },
  sosBtnT: { color: color.bad, fontFamily: font.bold, fontSize: 16 },
  secT: { fontSize: 13, color: color.muted, marginLeft: 16, marginBottom: -10 },
  hint: { color: color.muted, fontSize: 13.5, marginHorizontal: 16 },
  empty: { padding: 16, gap: 10, backgroundColor: color.surface, borderRadius: 16 },
  emptyT: { fontSize: 17, fontFamily: font.semi, color: color.ink },
  emptyS: { color: color.muted },
  card: { backgroundColor: color.surface, borderRadius: 16, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },
  name: { fontSize: 17, fontFamily: font.semi, color: color.ink },
  where: { color: color.muted, fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaT: { color: color.muted, fontSize: 13.5, flexShrink: 1 },
  dist: { alignItems: 'flex-end' },
  distNum: { fontFamily: font.bold, fontSize: 26, color: color.ink, lineHeight: 30 },
  distUnit: { color: color.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  call: { flex: 1, backgroundColor: color.accent, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  callText: { color: color.accentInk, fontFamily: font.semi, fontSize: 16 },
  more: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: color.tealText, fontFamily: font.semi, fontSize: 16 },
});
