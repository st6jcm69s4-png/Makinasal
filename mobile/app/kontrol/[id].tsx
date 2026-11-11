import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlainText, Text } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/Toast';
import { inspectionFor, inspectKey, type Mark, type Marks } from '../../lib/inspection';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { color, font, radius } from '../../lib/theme';

/** Ekspertiz kontrol listesi: makineyi yerinde incelerken madde madde işaretlenir. */
export default function InspectScreen() {
  const { id, title, cat } = useLocalSearchParams<{ id: string; title?: string; cat?: string }>();
  useLang();
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => inspectionFor(cat ?? ''), [cat]);
  const total = sections.reduce((a, x) => a + x.items.length, 0);
  const [marks, setMarks] = useState<Marks>({});

  useEffect(() => {
    void AsyncStorage.getItem(inspectKey(id)).then((v) => { if (v) setMarks(JSON.parse(v) as Marks); }).catch(() => undefined);
  }, [id]);
  const set = (item: string, m: Mark) => {
    setMarks((cur) => {
      const next = { ...cur };
      if (next[item] === m) delete next[item]; else next[item] = m;
      void AsyncStorage.setItem(inspectKey(id), JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };
  const ok = Object.values(marks).filter((m) => m === 'ok').length;
  const bad = Object.values(marks).filter((m) => m === 'bad').length;
  const done = ok + bad;

  const share = async () => {
    const lines = [`${tr('Ekspertiz kontrol listesi')}: ${title ?? ''}`.trim(), `${tr('Sorun yok')}: ${ok} · ${tr('Sorun var')}: ${bad} · ${tr('Bakılmadı')}: ${total - done}`];
    for (const s of sections) {
      const problems = s.items.filter((i) => marks[i] === 'bad');
      if (problems.length) lines.push('', `${tr(s.title)}:`, ...problems.map((p) => `✗ ${tr(p)}`));
    }
    await Share.share({ message: lines.join('\n') }).catch(() => undefined);
  };
  const reset = () => { setMarks({}); void AsyncStorage.removeItem(inspectKey(id)).catch(() => undefined); toast('Liste sıfırlandı.', 'info'); };

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: tr('Ekspertiz kontrol listesi') }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 14 }}>
        {title ? <PlainText style={s.title} numberOfLines={2}>{title}</PlainText> : null}
        <Text style={s.lead}>Makineyi görmeye gittiğinde her maddeye bak ve işaretle. İşaretlerin yalnızca bu telefonda saklanır.</Text>

        <View style={s.sum}>
          <View style={s.bar}><View style={[s.barOk, { flex: ok }]} /><View style={[s.barBad, { flex: bad }]} /><View style={{ flex: Math.max(total - done, 0) }} /></View>
          <View style={s.sumRow}>
            <PlainText style={[s.sumT, { color: color.good }]}>{`${ok} ${tr('sorun yok')}`}</PlainText>
            <PlainText style={[s.sumT, { color: color.bad }]}>{`${bad} ${tr('sorun var')}`}</PlainText>
            <PlainText style={s.sumT}>{`${total - done} ${tr('bakılmadı')}`}</PlainText>
          </View>
        </View>

        {sections.map((sec) => (
          <View key={sec.title} style={s.card}>
            <Text style={s.h}>{sec.title}</Text>
            {sec.items.map((it, i) => (
              <View key={it} style={[s.row, i > 0 && s.sep]}>
                <Text style={s.item}>{it}</Text>
                <Pressable onPress={() => set(it, 'ok')} hitSlop={4} style={[s.mark, marks[it] === 'ok' && { backgroundColor: color.good, borderColor: color.good }]} accessibilityRole="button" accessibilityState={{ selected: marks[it] === 'ok' }} accessibilityLabel={`${tr('Sorun yok')}: ${tr(it)}`}>
                  <Icon name="check" size={18} color={marks[it] === 'ok' ? color.bg : color.muted} />
                </Pressable>
                <Pressable onPress={() => set(it, 'bad')} hitSlop={4} style={[s.mark, marks[it] === 'bad' && { backgroundColor: color.bad, borderColor: color.bad }]} accessibilityRole="button" accessibilityState={{ selected: marks[it] === 'bad' }} accessibilityLabel={`${tr('Sorun var')}: ${tr(it)}`}>
                  <Icon name="x" size={18} color={marks[it] === 'bad' ? color.bg : color.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.note}>Bu liste yol göstericidir, uzman ekspertizinin yerini tutmaz. Yüksek tutarlı alımlarda yetkili servisten rapor iste.</Text>
        {done ? <Pressable onPress={reset} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}><Text style={s.reset}>Listeyi sıfırla</Text></Pressable> : null}
      </ScrollView>
      <View style={[s.foot, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={({ pressed }) => [s.btn, !done && { opacity: 0.45 }, pressed && { opacity: 0.85 }]} disabled={!done} onPress={() => void share()} accessibilityRole="button" accessibilityState={{ disabled: !done }}>
          <Icon name="share" size={18} color={color.tealInk} />
          <Text style={s.btnT}>Özeti paylaş</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: color.ink },
  lead: { fontSize: 14.5, lineHeight: 21, color: color.muted },
  sum: { backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line, padding: 12, gap: 10 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: color.plate, overflow: 'hidden' },
  barOk: { backgroundColor: color.good },
  barBad: { backgroundColor: color.bad },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sumT: { fontFamily: font.semi, fontSize: 13, color: color.muted },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  h: { fontFamily: font.bold, fontSize: 18, color: color.ink, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  sep: { borderTopWidth: 1, borderTopColor: color.line },
  item: { flex: 1, fontSize: 14.5, lineHeight: 20, color: color.ink },
  mark: { width: 44, height: 40, borderRadius: 12, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
  note: { fontSize: 13, lineHeight: 19, color: color.muted },
  reset: { fontFamily: font.semi, fontSize: 14, color: color.bad },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.line },
  btn: { height: 50, borderRadius: radius + 2, backgroundColor: color.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnT: { fontFamily: font.bold, fontSize: 17, color: color.tealInk },
});
