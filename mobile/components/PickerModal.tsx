import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type Option = { value: string; label: string };

export function PickerModal({ visible, title, options, selected, onPick, onClose }: {
  visible: boolean; title: string; options: Option[]; selected?: string; onPick: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.head}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}><Text style={s.close}>Kapat</Text></Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable style={s.row} onPress={() => { onPick(item.value); onClose(); }} accessibilityRole="button">
                <Text style={[s.label, item.value === selected && s.sel]}>{item.label}{item.value === selected ? '  ✓' : ''}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontWeight: '700', fontSize: 16 },
  close: { color: '#6B1E2E', fontWeight: '600' },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  label: { color: '#25272D' },
  sel: { color: '#6B1E2E', fontWeight: '700' },
});
