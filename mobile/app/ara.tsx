import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon } from '../components/Icon';
import { useLang } from '../lib/lang';
import { useApp } from '../lib/AppContext';
import { androidThemeHidden, findFeatures, type Feature } from '../lib/features';
import { color, font, radius } from '../lib/theme';

/** Uygulama içi arama: "koyu mod", "şifre", "dil", "ilan ver" gibi yazınca ilgili ayar veya sayfa açılır. */
export default function AppSearch() {
  const { setLang } = useLang();
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [done, setDone] = useState('');
  const signedIn = !!session;
  const items = useMemo(() => findFeatures(q, { signedIn, androidThemeHidden }), [q, signedIn]);
  const pick = async (f: Feature) => {
    const msg = await f.run({ setLang, signedIn });
    if (msg) setDone(String(msg));
  };
  return (
    <View style={s.screen}>
      <View style={s.box}>
        <Icon name="search" size={20} color={color.muted} />
        <TextInput
          style={s.input} value={q} onChangeText={(v) => { setQ(v); setDone(''); }} autoFocus autoCorrect={false} autoCapitalize="none"
          placeholder="Ayar, sayfa veya özellik ara (ör. koyu mod)" returnKeyType="search" maxLength={80}
          onSubmitEditing={() => { if (items[0]) void pick(items[0]); }}
        />
        {q ? <Pressable onPress={() => { setQ(''); setDone(''); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Temizle"><Icon name="x" size={20} color={color.muted} /></Pressable> : null}
      </View>
      {done ? <View style={s.done}><Icon name="check-circle" size={18} color={color.teal} /><Text style={s.doneText}>{done}</Text></View> : null}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.head}>{q ? 'Sonuçlar' : 'Önerilenler'}</Text>
        {items.map((f) => (
          <Pressable key={f.id} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]} onPress={() => void pick(f)} accessibilityRole="button">
            <View style={s.icon}><Icon name={f.icon} size={20} color={color.accentText} /></View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={s.title}>{f.title}</Text>
              <Text style={s.sub} numberOfLines={1}>{f.sub}</Text>
            </View>
            <Icon name={f.action ? 'zap' : 'chevron-right'} size={18} color={color.muted} />
          </Pressable>
        ))}
        {q && !items.length ? <Text style={s.none}>Eşleşen ayar veya sayfa bulunamadı.</Text> : null}
        {q.trim().length > 1 ? (
          <Pressable style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]} onPress={() => router.replace({ pathname: '/ilanlar', params: { q: q.trim() } } as never)} accessibilityRole="button">
            <View style={[s.icon, { backgroundColor: color.tealSoft }]}><Icon name="truck" size={20} color={color.teal} /></View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={s.title}>İlanlarda ara</Text>
              <PlainText style={s.sub} numberOfLines={1}>{`“${q.trim()}”`}</PlainText>
            </View>
            <Icon name="chevron-right" size={18} color={color.muted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 8, paddingHorizontal: 14, minHeight: 52, backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  input: { flex: 1, fontSize: 17, paddingVertical: 12 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 4, padding: 12, backgroundColor: color.tealSoft, borderRadius: radius },
  doneText: { color: color.ink, fontFamily: font.semi, flex: 1 },
  head: { fontFamily: font.semi, color: color.muted, fontSize: 13.5, marginHorizontal: 20, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: color.surface, borderRadius: radius + 2, borderWidth: 1, borderColor: color.line },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: color.ink, fontFamily: font.semi, fontSize: 16 },
  sub: { color: color.muted, fontSize: 13.5 },
  none: { color: color.muted, marginHorizontal: 20, marginTop: 8 },
});
