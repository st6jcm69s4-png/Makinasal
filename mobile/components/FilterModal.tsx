import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text, TextInput } from './LText';
import { PickerModal } from './PickerModal';
import { Btn, Chip } from './ui';
import { brandsForCategory } from '../lib/machineryCatalog';
import { color } from '../lib/theme';

export type Adv = { brand: string; yMin: string; yMax: string; useMin: string; useMax: string; unit: 'sa' | 'km'; minScore: number; near: number; ver: boolean; hide: boolean; takas: boolean };
export const NO_ADV: Adv = { brand: '', yMin: '', yMax: '', useMin: '', useMax: '', unit: 'sa', minScore: 0, near: 0, ver: false, hide: false, takas: false };
export const advCount = (a: Adv) => [a.brand, a.yMin, a.yMax, a.useMin, a.useMax].filter(Boolean).length + (a.minScore ? 1 : 0) + (a.near ? 1 : 0) + [a.ver, a.hide, a.takas].filter(Boolean).length;

export function FilterModal({ visible, value, category, part, onApply, onClose }: { visible: boolean; value: Adv; category: string; part: boolean; onApply: (a: Adv) => void; onClose: () => void }) {
  const [a, setA] = useState<Adv>(value);
  const [brandSheet, setBrandSheet] = useState(false);
  const set = <K extends keyof Adv>(k: K, v: Adv[K]) => setA((c) => ({ ...c, [k]: v }));
  const num = (k: 'yMin' | 'yMax' | 'useMin' | 'useMax') => (v: string) => set(k, v.replace(/\D/g, ''));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onShow={() => setA(value)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" />
          <View style={s.sheet}>
            <View style={s.head}><Text style={s.title}>Gelişmiş filtreler</Text><Pressable onPress={onClose} hitSlop={10} accessibilityRole="button"><Text style={s.close}>Kapat</Text></Pressable></View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Marka</Text>
              <Pressable style={s.input} onPress={() => setBrandSheet(true)} accessibilityRole="button"><Text style={{ color: a.brand ? color.navy : color.muted }}>{a.brand || 'Tümü'}</Text></Pressable>
              {!part ? (
                <>
                  <Text style={s.label}>Model yılı</Text>
                  <View style={s.row}>
                    <TextInput style={[s.input, { flex: 1 }]} placeholder="En az" keyboardType="number-pad" maxLength={4} value={a.yMin} onChangeText={num('yMin')} />
                    <TextInput style={[s.input, { flex: 1 }]} placeholder="En çok" keyboardType="number-pad" maxLength={4} value={a.yMax} onChangeText={num('yMax')} />
                  </View>
                  <Text style={s.label}>Kullanım</Text>
                  <View style={s.row}>
                    <Chip title="Saat" on={a.unit === 'sa'} onPress={() => set('unit', 'sa')} />
                    <Chip title="Kilometre" on={a.unit === 'km'} onPress={() => set('unit', 'km')} />
                  </View>
                  <View style={s.row}>
                    <TextInput style={[s.input, { flex: 1 }]} placeholder="En az" keyboardType="number-pad" value={a.useMin} onChangeText={num('useMin')} />
                    <TextInput style={[s.input, { flex: 1 }]} placeholder="En çok" keyboardType="number-pad" value={a.useMax} onChangeText={num('useMax')} />
                  </View>
                </>
              ) : null}
              <Text style={s.label}>En düşük satıcı puanı</Text>
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                {[[0, 'Hepsi'], [3, '3+'], [4, '4+'], [4.5, '4,5+']].map(([v, l]) => <Chip key={String(v)} title={String(l)} on={a.minScore === v} onPress={() => set('minScore', Number(v))} />)}
              </View>
              <Text style={s.label}>Bana uzaklık</Text>
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                {[[0, 'Hepsi'], [50, '50 km'], [150, '150 km'], [300, '300 km'], [600, '600 km']].map(([v, l]) => <Chip key={String(v)} title={String(l)} on={a.near === v} onPress={() => set('near', Number(v))} />)}
              </View>
              <View style={s.sw}><Text style={{ flex: 1 }}>Yalnızca doğrulanmış satıcılar</Text><Switch value={a.ver} onValueChange={(v) => set('ver', v)} /></View>
              <View style={s.sw}><Text style={{ flex: 1 }}>Riskli satıcıları gizle</Text><Switch value={a.hide} onValueChange={(v) => set('hide', v)} /></View>
              <View style={s.sw}><Text style={{ flex: 1 }}>Yalnızca takas olanlar</Text><Switch value={a.takas} onValueChange={(v) => set('takas', v)} /></View>
              <Btn title="Uygula" onPress={() => { onApply(a); onClose(); }} />
              <Btn ghost title="Filtreleri temizle" onPress={() => { onApply(NO_ADV); setA(NO_ADV); onClose(); }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      <PickerModal visible={brandSheet} title="Marka" searchable allowCustom selected={a.brand} options={[{ value: '', label: 'Tümü' }, ...brandsForCategory(category).map((b) => ({ value: b, label: b }))]} onPick={(v) => set('brand', v)} onClose={() => setBrandSheet(false)} />
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: color.line },
  title: { fontWeight: '700', fontSize: 16 },
  close: { color: color.accentText, fontWeight: '600' },
  label: { fontWeight: '600', color: color.ink },
  input: { padding: 12, backgroundColor: color.surface, borderRadius: 4, borderWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', gap: 8 },
  sw: { flexDirection: 'row', alignItems: 'center' },
});
