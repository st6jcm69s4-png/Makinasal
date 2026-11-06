import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Icon, type IconName } from './Icon';
import { color, font, radius, shadow } from '../lib/theme';

export type Item = { icon: IconName; label: string; sub?: string; go: () => void; badge?: number | string };

function Row({ it, last }: { it: Item; last: boolean }) {
  return (
    <Pressable style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { opacity: 0.8 }]} onPress={it.go} accessibilityRole="button">
      <View style={s.icon}><Icon name={it.icon} size={19} color={color.tealText} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{it.label}</Text>
        {it.sub ? <Text style={s.rowSub}>{it.sub}</Text> : null}
      </View>
      {it.badge ? <View style={s.badge}><Text style={s.badgeText}>{it.badge}</Text></View> : null}
      <Icon name="chevron-right" size={18} color={color.muted} />
    </Pressable>
  );
}
export function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.title}>{title}</Text>
      <View style={s.group}>{items.map((it, i) => <Row key={it.label} it={it} last={i === items.length - 1} />)}</View>
    </View>
  );
}


const s = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 18, color: color.ink, marginLeft: 4 },
  group: { backgroundColor: color.surface, borderRadius: radius + 4, paddingHorizontal: 12, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 58 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16, color: color.ink, fontFamily: font.semi },
  rowSub: { fontSize: 13, color: color.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: color.tealInk, fontSize: 12, fontWeight: '700' },
});
