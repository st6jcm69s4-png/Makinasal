import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { Text, TextInput } from './LText';
import { useLang } from '../lib/lang';
import { tr } from '../lib/i18n';
import { caps, color, font, radius } from '../lib/theme';

/** Alan etiketi: küçük, sıkı, büyük harf (ruhsattaki alan başlığı gibi). */
export function Label({ children, style }: { children: string; style?: object }) {
  const { lang } = useLang();
  return <Text style={[s.labelText, { fontFamily: font.label }, style]}>{caps(tr(children), lang)}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={s.cell}>
      <Label>{label}</Label>
      <TextInput style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]} placeholderTextColor="#9A949A" {...props} />
    </View>
  );
}
export function Select({ label, value, onPress, placeholder = 'Seç' }: { label: string; value: string; onPress: () => void; placeholder?: string }) {
  return (
    <View style={s.cell}>
      <Label>{label}</Label>
      <Pressable style={[s.input, s.selectRow]} onPress={onPress} accessibilityRole="button" accessibilityLabel={tr(label)}>
        <Text style={{ color: value ? color.ink : '#9A949A', fontSize: 16, flex: 1 }} numberOfLines={1}>{value || placeholder}</Text>
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
      <Text style={[s.chipText, on && { color: color.accentInk }]}>{title}</Text>
    </Pressable>
  );
}

/** Bölüm başlığı: ince lacivert çizgi üstte, etiket altta. */
export function Band({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: object }) {
  return (
    <View style={[s.band, style]}>
      <Label style={{ color: color.ink, fontSize: 14, letterSpacing: 0.9 }}>{title}</Label>
      {action ? <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button"><Text style={s.bandAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

/** Ruhsat alanı: etiket üstte, değer altta. */
export function FieldCell({ label, value, strong, style }: { label: string; value: string | number | null | undefined; strong?: boolean; style?: object }) {
  return (
    <View style={[s.fcell, style]}>
      <Label>{label}</Label>
      <Text style={[s.fvalue, strong && { color: color.accent, fontWeight: '700' }]} numberOfLines={2}>{value === null || value === undefined || value === '' ? '–' : String(value)}</Text>
    </View>
  );
}
/** Alan ızgarası: hücreler ince çizgiyi paylaşır. */
export function FieldGrid({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.grid, style]}>{children}</View>;
}

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  card: { backgroundColor: color.surface, padding: 12, borderRadius: radius, gap: 4, borderWidth: 1, borderColor: color.line },
  title: { fontWeight: '600', color: color.ink, fontSize: 16 },
  price: { fontWeight: '700', color: color.accent, fontSize: 17 },
  meta: { color: color.muted, fontSize: 14 },
  err: { color: color.bad, fontSize: 14 },
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  h2: { fontWeight: '700', fontSize: 17, color: color.ink },
});
const s = StyleSheet.create({
  labelText: { fontSize: 11.5, letterSpacing: 0.8, color: color.muted },
  cell: { gap: 5 },
  input: { paddingVertical: 11, paddingHorizontal: 12, backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, fontSize: 16, color: color.ink },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { backgroundColor: color.accent, paddingVertical: 13, paddingHorizontal: 14, borderRadius: radius, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  btnText: { color: color.accentInk, fontWeight: '600', fontSize: 16 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.accent },
  ghostText: { color: color.accent },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.bad },
  dangerText: { color: color.bad },
  chip: { paddingVertical: 9, paddingHorizontal: 13, backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: color.navy, borderColor: color.navy },
  chipText: { color: color.ink, fontSize: 15, fontWeight: '500' },
  band: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: color.navy, paddingTop: 8, marginTop: 22, marginBottom: 10, marginHorizontal: 12 },
  bandAction: { color: color.accent, fontWeight: '600', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderLeftWidth: 1, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  fcell: { flexGrow: 1, flexBasis: '33%', minWidth: '30%', paddingVertical: 8, paddingHorizontal: 10, gap: 2, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.line },
  fvalue: { fontSize: 16, color: color.ink, fontWeight: '500' },
});
