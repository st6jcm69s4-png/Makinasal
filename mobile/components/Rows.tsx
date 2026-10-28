import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Icon, type IconName } from './Icon';
import { Label } from './ui';
import { color, radius } from '../lib/theme';

export type Item = { icon: IconName; label: string; sub?: string; go: () => void; badge?: number | string };

function Row({ it, last }: { it: Item; last: boolean }) {
  return (
    <Pressable style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { backgroundColor: color.plate }]} onPress={it.go} accessibilityRole="button">
      <Icon name={it.icon} size={20} color={color.accentText} />
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
    <View style={{ gap: 6 }}>
      <Label style={{ marginLeft: 2 }}>{title}</Label>
      <View style={s.group}>{items.map((it, i) => <Row key={it.label} it={it} last={i === items.length - 1} />)}</View>
    </View>
  );
}


const s = StyleSheet.create({
  group: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, minHeight: 50 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  rowLabel: { fontSize: 16, color: color.ink, fontWeight: '500' },
  rowSub: { fontSize: 13, color: color.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
