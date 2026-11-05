import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { getLang, localeOf, tr } from '../lib/i18n';
import { color } from '../lib/theme';

type L = { id: string; title: string; price: number | string; city: string; category: string; year: number | null; usage_value: number | null; usage_unit: string | null; takas: boolean | null; listing_photos: { path: string; position: number }[] | null };

export default function Compare() {
  const { cmp, toggleCmp } = useApp();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<L[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    setRows(cmp.length ? null : []);
    if (!cmp.length) return;
    void supabase.from('listings').select('id,title,price,city,category,year,usage_value,usage_unit,takas,listing_photos(path,position)').in('id', cmp).eq('status', 'active').eq('moderation_status', 'approved')
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setError(true); return; }
        const byId = new Map(((data ?? []) as L[]).map((item) => [item.id, item]));
        setRows(cmp.flatMap((id) => { const row = byId.get(id); return row ? [row] : []; }));
      });
    return () => { live = false; };
  }, [cmp, attempt]);

  const visible = rows ?? [];
  const first = visible[0];
  const labelWidth = 86;
  const cellWidth = Math.max(112, Math.floor((width - 24 - labelWidth) / Math.min(2, Math.max(1, visible.length))));
  const number = (n: number) => n.toLocaleString(localeOf(getLang()));
  const delta = (d: number, format: (n: number) => string) => (d > 0 ? '+' : d < 0 ? '−' : '') + format(Math.abs(d));
  const part = (r: L) => r.category === 'Yedek parça' || r.category === 'Lastik ve jant';
  const lines: { label: string; value: (r: L) => string; diff?: (r: L) => string | undefined }[] = [
    { label: 'Fiyat', value: (r) => tl(r.price), diff: (r) => first && Number.isFinite(Number(r.price)) && Number.isFinite(Number(first.price)) ? delta(Number(r.price) - Number(first.price), tl) : undefined },
    { label: 'İl', value: (r) => r.city },
    { label: 'Model yılı', value: (r) => r.year ? String(r.year) : '–' },
    { label: 'Kullanım', value: (r) => !part(r) && r.usage_value != null ? [number(r.usage_value), tr(r.usage_unit ?? '')].filter(Boolean).join(' ') : '–',
      diff: (r) => first && !part(first) && !part(r) && r.usage_unit && r.usage_unit === first.usage_unit && r.usage_value != null && first.usage_value != null ? delta(r.usage_value - first.usage_value, number) + ' ' + tr(r.usage_unit) : undefined },
    { label: 'Takas', value: (r) => tr(r.takas ? 'Olur' : 'Yok') },
  ];
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.body}>
      <View style={s.heading}>
        <Text style={s.kicker}>Saha Defteri</Text>
        <Text accessibilityRole="header" style={s.headingText}>Künyeleri karşılaştır</Text>
      </View>
      {error ? <View>
        <Text style={s.msg}>Karşılaştırma yüklenemedi.</Text>
        <Pressable accessibilityRole="button" onPress={() => retry((n) => n + 1)}><Text style={s.action}>Tekrar dene</Text></Pressable>
      </View> : rows === null ? <ActivityIndicator style={s.msg} /> : !rows.length ? (
        <Text style={s.msg}>Karşılaştırılacak ilan yok. İlan detayında "Karşılaştırmaya ekle"ye dokun (en fazla 3).</Text>
      ) : (
        <>
          {visible.length < cmp.length && <Text style={s.msg}>Bazı ilanlar artık yayında değil.</Text>}
          {visible.length === 1 && <Text style={s.msg}>Karşılaştırmak için bir ilan daha ekle.</Text>}
          <ScrollView horizontal>
            <View style={s.table}>
              <View style={s.row}>
                <View style={[s.cell, s.labelCell, { width: labelWidth }]}><Text style={s.label}>Özellik</Text></View>
                {visible.map((r) => {
                  const photo = [...(r.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
                  return <View key={r.id} style={[s.cell, { width: cellWidth }]}>
                    <Pressable accessibilityRole="link" onPress={() => router.push(`/ilan/${r.id}`)}>
                      {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.photo} /> : <View style={[s.photo, s.placeholder]}><Text style={s.delta}>Fotoğraf paylaşılmamış.</Text></View>}
                      <PlainText style={s.title}>{r.title}</PlainText>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => toggleCmp(r.id)}><Text style={s.remove}>Çıkar</Text></Pressable>
                  </View>;
                })}
              </View>
              {lines.map(({ label, value, diff }) => <View key={label} style={s.row}>
                <View style={[s.cell, s.labelCell, { width: labelWidth }]}><Text style={s.label}>{label}</Text></View>
                {visible.map((r, i) => {
                  const change = i > 0 ? diff?.(r) : undefined;
                  return <View key={r.id} style={[s.cell, { width: cellWidth }]}>
                    <PlainText style={s.value}>{value(r)}</PlainText>
                    {change && <Text style={s.delta}>İlk ilana göre{': '}<PlainText>{change}</PlainText></Text>}
                  </View>;
                })}
              </View>)}
            </View>
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: color.surface },
  body: { padding: 12, paddingBottom: 32 },
  heading: { borderTopWidth: 4, borderTopColor: color.ink, paddingVertical: 12 },
  kicker: { color: color.good, fontWeight: '800', fontSize: 12 },
  headingText: { color: color.ink, fontWeight: '800', fontSize: 26 },
  msg: { color: color.muted, marginVertical: 12 },
  action: { color: color.good, fontWeight: '700', paddingVertical: 10 },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: color.line },
  cell: { padding: 8, borderRightWidth: 1, borderColor: color.line, gap: 6 },
  labelCell: { backgroundColor: color.plate },
  label: { color: color.muted, fontWeight: '700', fontSize: 12 },
  photo: { width: '100%', height: 70, backgroundColor: color.plate },
  placeholder: { justifyContent: 'center', padding: 4 },
  title: { fontWeight: '700', color: color.ink, fontSize: 13, marginTop: 7 },
  value: { color: color.ink, fontSize: 14 },
  delta: { color: color.muted, fontSize: 11 },
  remove: { color: color.bad, fontSize: 12, paddingVertical: 8 },
});
