import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { PickerModal } from '../components/PickerModal';
import { Btn, Hatch, Label } from '../components/ui';
import { AlertBox, RowSkeleton } from '../components/kit';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from '../components/LoginPrompt';
import { CITIES } from '../lib/data';
import { COORDS } from '../lib/geo';
import { caps, color, font, radius } from '../lib/theme';
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
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.hero}>
        <Label style={{ color: color.onNavy }}>Yol yardım</Label>
        <PlainText style={s.h1}>{caps('En yakın çekiciyi bul', 'tr')}</PlainText>
        <Text style={s.lead}>Konumunu paylaş ya da il seç; çekiciler yakınlığa göre, puanlarıyla sıralanır.</Text>
        <Pressable style={({ pressed }) => [s.locBtn, pressed && { opacity: 0.85 }]} onPress={() => void useMyLocation()} disabled={locBusy} accessibilityRole="button">
          {locBusy ? <ActivityIndicator color="#fff" /> : <Icon name="crosshair" size={20} color="#fff" />}
          <Text style={s.locText}>{gps ? 'Konumum kullanılıyor · yenile' : 'Konumumu kullan'}</Text>
        </Pressable>
        <Pressable style={s.cityBtn} onPress={() => setSheet(true)} accessibilityRole="button">
          <Icon name="map-pin" size={18} color={color.onNavy} />
          <Text style={s.cityText}>{gps ? 'Ya da il seç' : city || 'İl seç'}</Text>
          <Icon name="chevron-down" size={18} color={color.onNavy} />
        </Pressable>
      </View>
      <Hatch height={7} />
      <View style={s.sos}><Icon name="alert-triangle" size={16} color={color.warn} /><Text style={s.sosText}>Can güvenliği tehlikesinde önce 112'yi ara.</Text></View>

      {rows === null ? <RowSkeleton count={4} /> : null}
      {error ? <View style={{ margin: 12 }}><AlertBox variant="destructive">{error}</AlertBox></View> : null}
      {rows && !rows.length && !error ? (
        <View style={s.empty}>
          <Text style={s.emptyT}>Henüz kayıtlı çekici yok.</Text>
          <Text style={s.emptyS}>Çekici hizmeti veriyorsan firma profilini "Çekici / yol yardım" türüyle oluştur, burada ilk sen görün.</Text>
          <Btn title="Firma profili oluştur" onPress={() => router.push('/ag/firma-kaydi')} />
        </View>
      ) : null}
      {!origin && rows?.length ? <Text style={s.hint}>Mesafeyi görmek için konumunu kullan ya da il seç.</Text> : null}

      {sorted.map(({ t, d, serves }) => {
        const st = stats[t.user_id];
        return (
          <View key={t.user_id} style={s.card}>
            <Pressable onPress={() => router.push(`/firma/${t.user_id}` as never)} accessibilityRole="button" style={s.cardTop}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.name} numberOfLines={2}>{t.name}</Text>
                <Text style={s.where}>{[t.city, t.district].filter(Boolean).join(' / ')}</Text>
              </View>
              <View style={s.dist}>
                <PlainText style={s.distNum}>{d == null ? '–' : String(d)}</PlainText>
                <Label>km</Label>
              </View>
            </Pressable>
            <View style={s.strip}>
              <View style={s.cell}>
                <Label>Puan</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="star" size={14} color={st && st.review_count ? color.accent : color.muted} />
                  <Text style={s.val}>{st && st.review_count ? `${st.score.toFixed(1)} (${st.review_count})` : 'Yeni'}</Text>
                </View>
              </View>
              <View style={[s.cell, s.cellL]}>
                <Label>Hizmet</Label>
                <Text style={s.val} numberOfLines={1}>{serves ? 'Bölgende hizmet veriyor' : `${t.service_cities.length} il`}</Text>
              </View>
            </View>
            <View style={s.actions}>
              <Pressable style={({ pressed }) => [s.call, pressed && { opacity: 0.85 }]} onPress={() => void call(t.user_id)} accessibilityRole="button">
                <Icon name="phone" size={18} color="#fff" /><Text style={s.callText}>Ara</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [s.more, pressed && { backgroundColor: color.plate }]} onPress={() => router.push(`/firma/${t.user_id}` as never)} accessibilityRole="button">
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

const s = StyleSheet.create({
  hero: { backgroundColor: color.navy, padding: 16, gap: 8 },
  h1: { color: '#fff', fontFamily: font.labelBold, fontSize: 34, lineHeight: 36, letterSpacing: 0.5 },
  lead: { color: color.onNavy },
  locBtn: { backgroundColor: color.accent, borderRadius: radius, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  locText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cityBtn: { borderWidth: 1, borderColor: color.navy2, backgroundColor: color.navy2, borderRadius: radius, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  cityText: { flex: 1, color: '#fff', fontSize: 16 },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.warnBg, paddingVertical: 8, paddingHorizontal: 14 },
  sosText: { color: color.warn, fontSize: 14, fontWeight: '600' },
  err: { color: color.bad, margin: 12 },
  hint: { color: color.muted, margin: 12, marginBottom: 0 },
  empty: { margin: 12, padding: 16, gap: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  emptyT: { fontSize: 17, fontWeight: '700', color: color.ink },
  emptyS: { color: color.muted },
  card: { marginHorizontal: 12, marginTop: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-start' },
  name: { fontSize: 17, fontWeight: '700', color: color.ink },
  where: { color: color.muted, fontSize: 14 },
  dist: { alignItems: 'flex-end' },
  distNum: { fontFamily: font.bold, fontSize: 30, color: color.accentText, lineHeight: 32 },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { flex: 1, paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  cellL: { flex: 1.5, borderLeftWidth: 1, borderLeftColor: color.line },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  call: { flex: 1, backgroundColor: color.accent, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  callText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  more: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: color.accentText, fontWeight: '600', fontSize: 15 },
});
