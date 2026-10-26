import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}
export function Select({ label, value, onPress, placeholder = 'Seç' }: { label: string; value: string; onPress: () => void; placeholder?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.input} onPress={onPress} accessibilityRole="button"><Text style={{ color: value ? '#25272D' : '#999' }}>{value || placeholder}</Text></Pressable>
    </View>
  );
}
export function Btn({ title, onPress, ghost, danger, disabled }: { title: string; onPress: () => void; ghost?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      style={[s.btn, ghost && s.ghost, danger && s.danger, disabled && { opacity: 0.5 }]}
      disabled={disabled} onPress={onPress} accessibilityRole="button"
    >
      <Text style={[s.btnText, ghost && s.ghostText, danger && s.dangerText]}>{title}</Text>
    </Pressable>
  );
}
export function Chip({ title, on, onPress }: { title: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.chip, on && s.chipOn]} onPress={onPress} accessibilityRole="button">
      <Text style={on ? { color: '#fff' } : { color: '#25272D' }}>{title}</Text>
    </Pressable>
  );
}
export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F3' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, gap: 4 },
  title: { fontWeight: '700', color: '#25272D' },
  price: { fontWeight: '700', color: '#800020' },
  meta: { color: '#666' },
  err: { color: '#b00020' },
  empty: { textAlign: 'center', color: '#666', margin: 24 },
  h2: { fontWeight: '700', fontSize: 16 },
});
const s = StyleSheet.create({
  label: { fontWeight: '600', color: '#25272D' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD9DC' },
  btn: { backgroundColor: '#800020', padding: 13, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#800020' },
  ghostText: { color: '#800020' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#b00020' },
  dangerText: { color: '#b00020' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#DDD9DC' },
  chipOn: { backgroundColor: '#800020', borderColor: '#800020' },
});
