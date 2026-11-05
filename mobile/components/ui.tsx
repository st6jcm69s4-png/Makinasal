import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { Text, TextInput } from './LText';
import { tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

/** Alan etiketi: küçük, soluk, normal yazım. */
export function Label({ children, style }: { children: string; style?: object }) {
  return <Text style={[s.labelText, { fontFamily: font.label }, style]}>{tr(children)}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={s.cell}>
      <Label>{label}</Label>
      <TextInput style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]} placeholderTextColor={color.muted} {...props} />
    </View>
  );
}
export function Select({ label, value, onPress, placeholder = 'Seç' }: { label: string; value: string; onPress: () => void; placeholder?: string }) {
  return (
    <View style={s.cell}>
      <Label>{label}</Label>
      <Pressable style={[s.input, s.selectRow]} onPress={onPress} accessibilityRole="button" accessibilityLabel={tr(label)}>
        <Text style={{ color: value ? color.ink : color.muted, fontSize: 16, flex: 1 }} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={{ color: color.muted, fontSize: 16 }}>▾</Text>
      </Pressable>
    </View>
  );
}
export function Btn({ title, onPress, ghost, danger, disabled }: { title: string; onPress: () => void; ghost?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [s.btn, ghost && s.ghost, danger && s.danger, disabled && { opacity: 0.45 }, pressed && !disabled && { opacity: 0.8 }]}
      disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[s.btnText, ghost && s.ghostText, danger && s.dangerText]}>{title}</Text>
    </Pressable>
  );
}
export function Chip({ title, on, onPress }: { title: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text style={[s.chipText, on && { color: color.tealInk }]}>{title}</Text>
    </Pressable>
  );
}

/** Bölüm başlığı: büyük, koyu; sağda küçük bağlantı. */
export function Band({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: object }) {
  return (
    <View style={[s.band, style]}>
      <Text style={s.bandTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button"><Text style={s.bandAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

/** Ruhsat alanı: etiket üstte, değer altta. */
export function FieldCell({ label, value, strong, style }: { label: string; value: string | number | null | undefined; strong?: boolean; style?: object }) {
  return (
    <View style={[s.fcell, style]}>
      <Label>{label}</Label>
      <Text style={[s.fvalue, strong && { color: color.accentText, fontWeight: '700' }]} numberOfLines={2}>{value === null || value === undefined || value === '' ? '–' : String(value)}</Text>
    </View>
  );
}
/** Alan ızgarası: hücreler ince çizgiyi paylaşır. */
export function FieldGrid({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.grid, style]}>{children}</View>;
}

/** İnce mandalina çizgisi (üst başlık altı). */
export function Hatch(_props: { height?: number }) {
  return <View style={{ height: 3, backgroundColor: color.pop }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  card: { backgroundColor: color.surface, padding: 14, borderRadius: radius + 4, gap: 4, borderWidth: 1, borderColor: color.line, ...shadow },
  title: { fontWeight: '600', color: color.ink, fontSize: 16 },
  price: { fontWeight: '700', color: color.accentText, fontSize: 17 },
  meta: { color: color.muted, fontSize: 14 },
  err: { color: color.bad, fontSize: 14 },
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  h2: { fontWeight: '700', fontSize: 17, color: color.ink },
});
const s = StyleSheet.create({
  labelText: { fontSize: 13, color: color.muted },
  cell: { gap: 5 },
  input: { paddingVertical: 13, paddingHorizontal: 14, backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, fontSize: 16, color: color.ink },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { backgroundColor: color.accent, paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  btnText: { color: color.accentInk, fontWeight: '600', fontSize: 16 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color.teal },
  ghostText: { color: color.tealText },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.bad },
  dangerText: { color: color.bad },
  chip: { paddingVertical: 9, paddingHorizontal: 15, backgroundColor: color.surface, borderRadius: 999, borderWidth: 1, borderColor: color.line, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: color.teal, borderColor: color.teal },
  chipText: { color: color.ink, fontSize: 15, fontWeight: '500' },
  band: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 30, marginBottom: 12, marginHorizontal: 16 },
  bandTitle: { fontFamily: font.bold, fontSize: 21, lineHeight: 26, color: color.ink, flexShrink: 1 },
  bandAction: { color: color.tealText, fontFamily: font.semi, fontSize: 14.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderLeftWidth: 1, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  fcell: { flexGrow: 1, flexBasis: '33%', minWidth: '30%', paddingVertical: 8, paddingHorizontal: 10, gap: 2, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.line },
  fvalue: { fontSize: 16, color: color.ink, fontWeight: '500' },
});
