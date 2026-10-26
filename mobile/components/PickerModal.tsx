import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './LText';

export type Option = { value: string; label: string };
const norm = (v: string) => v.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '');

export function PickerModal({ visible, title, options, selected, onPick, onClose, searchable, allowCustom }: {
  visible: boolean; title: string; options: Option[]; selected?: string; onPick: (v: string) => void; onClose: () => void;
  /** Uzun listelerde arama kutusu gösterir (ör. marka). */
  searchable?: boolean;
  /** Listede olmayan bir değerin elle yazılmasına izin verir. */
  allowCustom?: boolean;
}) {
  const [q, setQ] = useState('');
  const close = () => { setQ(''); onClose(); };
  const term = norm(q);
  const shown = term ? options.filter((o) => norm(o.label).includes(term)) : options;
  const custom = allowCustom && q.trim() && !options.some((o) => norm(o.label) === term) ? q.trim() : '';
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.backdrop}>
          {/* Boş alana dokununca kapanır */}
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Kapat" />
          <View style={s.sheet}>
            <View style={s.head}>
              <Text style={s.title}>{title}</Text>
              <Pressable onPress={close} accessibilityRole="button" hitSlop={10}><Text style={s.close}>Kapat</Text></Pressable>
            </View>
            {searchable || allowCustom ? (
              <TextInput style={s.search} placeholder="Ara veya yaz" value={q} onChangeText={setQ} autoCorrect={false} />
            ) : null}
            <FlatList
              data={shown}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(o) => o.value || '_empty'}
              ListHeaderComponent={custom ? (
                <Pressable style={s.row} onPress={() => { onPick(custom); close(); }} accessibilityRole="button">
                  <Text style={[s.label, s.sel]}>Bunu kullan: “{custom}”</Text>
                </Pressable>
              ) : null}
              renderItem={({ item }) => (
                <Pressable style={s.row} onPress={() => { onPick(item.value); close(); }} accessibilityRole="button">
                  <Text style={[s.label, item.value === selected && s.sel]}>{item.label}{item.value === selected ? '  ✓' : ''}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontWeight: '700', fontSize: 16 },
  close: { color: '#800020', fontWeight: '600' },
  search: { margin: 12, padding: 10, backgroundColor: '#F6F5F3', borderRadius: 4, borderWidth: 1, borderColor: '#DDD9DC' },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  label: { color: '#25272D' },
  sel: { color: '#800020', fontWeight: '700' },
});
