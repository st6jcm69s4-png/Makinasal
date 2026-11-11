import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlainText, Text, TextInput } from './LText';
import { Icon } from './Icon';
import { PickerModal } from './PickerModal';
import { COORDS, distanceKm } from '../lib/geo';
import { getLang, localeOf, tr } from '../lib/i18n';
import { color, font, radius } from '../lib/theme';

/**
 * Nakliye tahmini: makinenin bulunduğu il ile alıcının ili arasındaki yaklaşık yol ve
 * alıcının girdiği km fiyatına göre kaba maliyet. Km fiyatı piyasaya ve yüke göre değiştiği için
 * uygulama rakam önermez; kullanıcı nakliyeciden aldığı fiyatı yazar (telefonda hatırlanır).
 */
const ROAD = 1.3; // kuş uçuşu mesafeyi karayoluna yaklaştırma katsayısı
const CITIES = Object.keys(COORDS).sort((a, b) => a.localeCompare(b, 'tr')).map((c) => ({ value: c, label: c }));

function vehicleFor(ton?: number): string {
  if (ton === undefined) return '';
  if (ton <= 3.5) return 'Kurtarıcı veya kamyonet yeterli olur';
  if (ton <= 15) return 'Sal kasa kamyon gerekir';
  if (ton <= 40) return 'Lowbed (alçak dorse) gerekir';
  return 'Özel yük taşıması gerekir (izin ve refakat)';
}

export function TransportEstimate({ from, ton, myCity }: { from: string; ton?: number; myCity?: string }) {
  const [to, setTo] = useState('');
  const [rate, setRate] = useState('');
  const [pick, setPick] = useState(false);
  useEffect(() => {
    void AsyncStorage.multiGet(['mk-my-city', 'mk-km-rate']).then((kv) => {
      const c = kv[0][1] || myCity || '';
      if (c && COORDS[c]) setTo(c);
      if (kv[1][1]) setRate(kv[1][1]);
    }).catch(() => undefined);
  }, [myCity]);
  const saveCity = (c: string) => { setTo(c); void AsyncStorage.setItem('mk-my-city', c).catch(() => undefined); };
  const saveRate = (v: string) => { const t = v.replace(/[^0-9.,]/g, '').slice(0, 7); setRate(t); void AsyncStorage.setItem('mk-km-rate', t).catch(() => undefined); };

  if (!COORDS[from]) return null;
  const air = to ? distanceKm(from, to) : null;
  const km = air === null ? null : Math.max(Math.round(air * ROAD / 10) * 10, air === 0 ? 0 : 10);
  const r = Number(rate.replace(',', '.'));
  const cost = km !== null && km > 0 && Number.isFinite(r) && r > 0 ? Math.round(km * r / 100) * 100 : null;
  const nf = (n: number) => n.toLocaleString(localeOf(getLang()));
  const vehicle = vehicleFor(ton);

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.k}>Nereye</Text>
          <Pressable style={s.field} onPress={() => setPick(true)} accessibilityRole="button" accessibilityLabel={tr('Teslim ili')}>
            <PlainText style={[s.fieldT, !to && { color: color.muted }]} numberOfLines={1}>{to || tr('İl seç')}</PlainText>
            <Icon name="chevron-down" size={16} color={color.muted} />
          </Pressable>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.k}>Km fiyatı (TL)</Text>
          <TextInput style={[s.field, s.fieldT]} value={rate} onChangeText={saveRate} keyboardType="decimal-pad" placeholder="Nakliyeciden sor" accessibilityLabel={tr('Km fiyatı (TL)')} />
        </View>
      </View>
      {km !== null ? (
        <View style={s.out}>
          <View style={{ flex: 1 }}>
            <PlainText style={s.route} numberOfLines={1}>{`${from} → ${to}`}</PlainText>
            <PlainText style={s.km}>{km === 0 ? tr('Aynı il') : `${tr('yaklaşık')} ${nf(km)} km`}</PlainText>
          </View>
          {cost !== null ? <PlainText style={s.cost}>{`≈ ${nf(cost)} TL`}</PlainText> : null}
        </View>
      ) : null}
      {vehicle ? <View style={s.veh}><Icon name="truck" size={15} color={color.tealText} /><Text style={s.vehT}>{vehicle}</Text></View> : null}
      <Text style={s.note}>Tahmindir: yol, köprü ve otoyol ücreti, yükleme ve dönüş boş kilometresi fiyatı değiştirir. Kesin fiyatı nakliyeciden al.</Text>
      <PickerModal visible={pick} title="Teslim ili" options={CITIES} selected={to} onPick={saveCity} onClose={() => setPick(false)} searchable />
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  k: { fontFamily: font.label, fontSize: 12, color: color.muted },
  field: { height: 46, borderRadius: radius, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  fieldT: { fontFamily: font.semi, fontSize: 15, color: color.ink, flexShrink: 1 },
  out: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.tealSoft, borderRadius: radius, paddingVertical: 10, paddingHorizontal: 12 },
  route: { fontFamily: font.semi, fontSize: 14, color: color.ink },
  km: { fontSize: 13, color: color.muted, marginTop: 1 },
  cost: { fontFamily: font.bold, fontSize: 20, color: color.tealText },
  veh: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  vehT: { fontFamily: font.semi, fontSize: 13.5, color: color.ink, flexShrink: 1 },
  note: { fontSize: 12.5, lineHeight: 17, color: color.muted },
});
