import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { GUIDE } from '../lib/guide';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';
import { color, font, radius } from '../lib/theme';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

/** Kullanım rehberi: her bölüm başlık, açıklama ve adım adım kullanım. Başlığa dokununca açılır. */
export default function GuideScreen() {
  useLang();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<Set<string>>(new Set(['home']));
  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const all = open.size === GUIDE.length;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}>
      <Stack.Screen options={{ title: tr('Kullanım rehberi') }} />
      <Text style={s.lead}>Uygulamanın her bölümü burada adım adım anlatılıyor. Bir başlığa dokunarak açıklamasını aç.</Text>
      <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); setOpen(all ? new Set() : new Set(GUIDE.map((g) => g.id))); }} accessibilityRole="button" style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
        <Text style={s.link}>{all ? 'Hepsini kapat' : 'Hepsini aç'}</Text>
      </Pressable>
      {GUIDE.map((g) => {
        const on = open.has(g.id);
        return (
          <View key={g.id} style={s.card}>
            <Pressable style={s.head} onPress={() => toggle(g.id)} accessibilityRole="button" accessibilityState={{ expanded: on }}>
              <View style={s.icon}><Icon name={g.icon} size={19} color={color.tealText} /></View>
              <Text style={s.title}>{g.title}</Text>
              <Icon name={on ? 'chevron-up' : 'chevron-down'} size={20} color={color.muted} />
            </Pressable>
            {on ? (
              <View style={s.body}>
                <Text style={s.intro}>{g.intro}</Text>
                <Text style={s.how}>Nasıl kullanılır</Text>
                {g.steps.map((st, i) => (
                  <View key={st} style={s.step}>
                    <View style={s.num}><Text style={s.numT}>{String(i + 1)}</Text></View>
                    <Text style={s.stepT}>{st}</Text>
                  </View>
                ))}
                {g.go ? (
                  <Pressable style={({ pressed }) => [s.go, pressed && { opacity: 0.8 }]} onPress={() => router.push(g.go as never)} accessibilityRole="button">
                    <Text style={s.goT}>{g.goLabel ?? 'Aç'}</Text>
                    <Icon name="arrow-right" size={16} color={color.tealText} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
      <Text style={[s.lead, { marginTop: 6 }]}>Aradığını bulamadıysan Ayarlar → Yardım merkezi üzerinden bize yaz.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  lead: { fontSize: 14.5, lineHeight: 21, color: color.muted },
  link: { fontFamily: font.semi, fontSize: 14, color: color.tealText },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 58 },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.bold, fontSize: 17, color: color.ink },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 9, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12 },
  intro: { fontSize: 15, lineHeight: 22, color: color.ink },
  how: { fontFamily: font.label, fontSize: 12.5, letterSpacing: 0.6, color: color.muted, marginTop: 4 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numT: { fontFamily: font.bold, fontSize: 12, color: color.ink },
  stepT: { flex: 1, fontSize: 14.5, lineHeight: 21, color: color.ink },
  go: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: color.tealSoft },
  goT: { fontFamily: font.semi, fontSize: 14, color: color.tealText },
});
