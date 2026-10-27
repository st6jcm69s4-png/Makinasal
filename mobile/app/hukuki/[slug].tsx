import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PlainText, Text } from '../../components/LText';
import { Hatch } from '../../components/ui';
import { LEGAL_TR, LEGAL_VERSION_LABEL, fillLegal, type LegalSlugTr } from '../../lib/legalTexts';
import { legalIdentity } from '../../lib/legal';
import { color, font } from '../../lib/theme';

/** Hukuki metinler uygulamanın içinde, internet sitesine bağlı kalmadan okunur. */
export default function LegalDoc() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const doc = LEGAL_TR[slug as LegalSlugTr];
  if (!doc) return <Text style={s.none}>Bu sayfa bulunamadı.</Text>;
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.head}>
        <PlainText style={s.title}>{doc.title}</PlainText>
        <Text style={s.ver}>{`Sürüm: ${LEGAL_VERSION_LABEL}`}</Text>
      </View>
      <Hatch height={6} />
      <View style={s.body}>
        {doc.intro ? <Text style={s.p}>{fillLegal(doc.intro, legalIdentity)}</Text> : null}
        {doc.sections.map(([h, paras]) => (
          <View key={h} style={s.sec}>
            <PlainText style={s.h}>{h}</PlainText>
            {paras.map((t) => <Text key={t} style={s.p}>{fillLegal(t, legalIdentity)}</Text>)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  none: { textAlign: 'center', color: color.muted, margin: 24 },
  head: { backgroundColor: color.navy, padding: 16, gap: 4 },
  title: { color: '#fff', fontFamily: font.labelBold, fontSize: 26, letterSpacing: 0.4 },
  ver: { color: color.onNavy, fontSize: 13 },
  body: { padding: 14, gap: 16 },
  sec: { gap: 6, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12 },
  h: { fontFamily: font.bold, fontSize: 17, color: color.ink },
  p: { color: color.ink, fontSize: 15, lineHeight: 22 },
});
