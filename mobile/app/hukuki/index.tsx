import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/LText';
import { Group } from '../../components/Rows';
import { router } from 'expo-router';
import { color } from '../../lib/theme';
import { openWeb } from '../../lib/web';

export default function Legal() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: 12, gap: 18, paddingBottom: 32 }}>
      <View style={s.note}>
        <Text style={s.p}>Hukuki metinler tek kaynaktan, web sitesinden yayınlanır; her açtığında güncel hâlini görürsün. Üye olurken kullanım koşullarını kabul etmiş olursun.</Text>
      </View>
      <Group title="Sözleşmeler ve politikalar" items={[
        { icon: 'file-text', label: 'Kullanım koşulları', sub: 'Üyelik sözleşmesi', go: () => openWeb('/hukuki/kullanim') },
        { icon: 'lock', label: 'KVKK aydınlatma metni', sub: 'Kişisel verilerin nasıl işlendiği', go: () => openWeb('/hukuki/kvkk') },
        { icon: 'settings', label: 'Çerez politikası', go: () => openWeb('/hukuki/cerez') },
        { icon: 'credit-card', label: 'Satış ve ödeme bilgileri', sub: 'Mesafeli satış, ön bilgilendirme', go: () => openWeb('/hukuki/satis') },
      ]} />
      <Group title="Haklarım" items={[
        { icon: 'user-check', label: 'Veri haklarım (KVKK md. 11)', sub: 'Veri kopyası, düzeltme, silme, itiraz', go: () => router.push('/haklarim' as never) },
        { icon: 'shield', label: 'Güven sistemi', go: () => router.push('/guven') },
        { icon: 'life-buoy', label: 'Yardım ve iletişim', go: () => router.push('/destek') },
      ]} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  note: { padding: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderLeftWidth: 3, borderLeftColor: color.navy },
  p: { color: color.ink, lineHeight: 21 },
});
