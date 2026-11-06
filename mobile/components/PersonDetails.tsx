import { StyleSheet, View } from 'react-native';
import { PlainText, Text } from './LText';
import { Icon, type IconName } from './Icon';
import { AVAILABILITY, isPersonDetails } from '../lib/personProfile';
import { tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

/** "Kendini tanıt" ilanının ayrıntılarını ilan sayfasında gösterir. */
export function PersonDetailsView({ details }: { details: unknown }) {
  if (!isPersonDetails(details)) return null;
  const d = details;
  const age = d.birthYear ? new Date().getFullYear() - d.birthYear : null;
  const facts: [IconName, string][] = [
    ['award', `${d.years} ${tr('yıl deneyim')}`],
    ...(age ? [['user', `${age} ${tr('yaşında')}`] as [IconName, string]] : []),
    ['calendar', tr(AVAILABILITY[d.availability])],
    ...(d.travel ? [['navigation', tr('Şehir dışına çıkabilir')] as [IconName, string]] : []),
  ];
  const chips = (list: string[], translate = true) => (
    <View style={s.chips}>{list.map((x) => <View key={x} style={s.chip}>{translate ? <Text style={s.chipT}>{x}</Text> : <PlainText style={s.chipT}>{x}</PlainText>}</View>)}</View>
  );
  return (
    <View style={s.card}>
      <View style={s.facts}>
        {facts.map(([ic, t]) => <View key={t} style={s.fact}><Icon name={ic} size={15} color={color.tealText} /><PlainText style={s.factT}>{t}</PlainText></View>)}
      </View>
      <Text style={s.h}>Kullanabildiği makineler</Text>
      {chips(d.machines)}
      {d.brands ? <PlainText style={s.muted}>{`${tr('Markalar')}: ${d.brands}`}</PlainText> : null}
      {d.certs.length ? <><Text style={s.h}>Belgeler</Text>{chips(d.certs)}</> : null}
      {d.licenses.length ? <><Text style={s.h}>Ehliyet sınıfları</Text>{chips(d.licenses, false)}</> : null}
      {d.workTypes.length ? <><Text style={s.h}>Çalışma şekli</Text>{chips(d.workTypes)}</> : null}
      {d.history.length ? (
        <>
          <Text style={s.h}>Geçmiş işler</Text>
          {d.history.map((h, i) => (
            <View key={i} style={s.hist}>
              <View style={s.dot} />
              <View style={{ flex: 1 }}>
                <PlainText style={s.histT}>{h.place || h.role}</PlainText>
                <PlainText style={s.muted}>{[h.place ? h.role : '', h.period].filter(Boolean).join(' · ')}</PlainText>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 10, ...shadow },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: color.tealSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  factT: { color: color.ink, fontSize: 13.5, fontWeight: '600' },
  h: { fontFamily: font.bold, fontSize: 15.5, color: color.ink, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 4 },
  chipT: { color: color.ink, fontSize: 13.5 },
  muted: { color: color.muted, fontSize: 13.5 },
  hist: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.teal, marginTop: 5 },
  histT: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
});
