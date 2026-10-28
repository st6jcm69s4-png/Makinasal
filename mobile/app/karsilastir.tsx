import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { supabase, tl } from '../lib/supabase';
import { getLang, localeOf } from '../lib/i18n';
import { color } from '../lib/theme';

type L = { id: string; title: string; price: number | string; city: string; year: number | null; usage_value: number | null; usage_unit: string | null; brand: string | null; model: string | null; takas: boolean | null };

export default function Compare() {
  const { cmp, toggleCmp } = useApp();
  const [rows, setRows] = useState<L[] | null>(null);
  useEffect(() => {
    if (!cmp.length) { setRows([]); return; }
    void supabase.from('listings').select('id,title,price,city,year,usage_value,usage_unit,brand,model,takas').in('id', cmp).eq('status', 'active').eq('moderation_status', 'approved')
      .then(({ data }) => setRows(cmp.map((id) => ((data ?? []) as L[]).find((r) => r.id === id)).filter(Boolean) as L[]));
  }, [cmp]);
  if (rows === null) return <ActivityIndicator style={{ margin: 32 }} />;
  if (!rows.length) return <Text style={s.msg}>Karşılaştırılacak ilan yok. İlan detayında "Karşılaştırmaya ekle"ye dokun (en fazla 3).</Text>;
  const min = Math.min(...rows.map((r) => Number(r.price)));
  const lines: [string, (r: L) => string][] = [
    ['Fiyat', (r) => tl(r.price)], ['İl', (r) => r.city], ['Model yılı', (r) => (r.year ? String(r.year) : '–')],
    ['Kullanım', (r) => (r.usage_value != null ? `${r.usage_value.toLocaleString(localeOf(getLang()))} ${r.usage_unit ?? ''}` : '–')], ['Takas', (r) => (r.takas ? 'Olur' : 'Yok')],
  ];
  return (
    <ScrollView horizontal contentContainerStyle={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 90, paddingTop: 64, gap: 14 }}>{lines.map(([l]) => <Text key={l} style={s.lbl}>{l}</Text>)}</View>
        {rows.map((r) => (
          <View key={r.id} style={s.col}>
            <Pressable onPress={() => router.push(`/ilan/${r.id}`)}><Text style={s.title} numberOfLines={2}>{r.title}</Text></Pressable>
            {lines.map(([l, f]) => <Text key={l} style={[s.val, l === 'Fiyat' && Number(r.price) === min && rows.length > 1 && { color: color.good, fontWeight: '700' }]}>{f(r)}</Text>)}
            <Pressable onPress={() => toggleCmp(r.id)}><Text style={s.rm}>Çıkar</Text></Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  col: { width: 150, backgroundColor: color.surface, padding: 10, borderRadius: 4, gap: 14 },
  title: { fontWeight: '700', height: 40, color: color.ink },
  lbl: { color: color.muted, fontWeight: '600' },
  val: { color: color.ink },
  rm: { color: color.bad, textAlign: 'center' },
});
