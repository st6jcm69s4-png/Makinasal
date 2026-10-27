import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/LText';
import { Group } from '../../components/Rows';
import { router } from 'expo-router';
import { color } from '../../lib/theme';

export default function Legal() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: 12, gap: 18, paddingBottom: 32 }}>
      <View style={s.note}>
        <Text style={s.p}>Hukuki metinler uygulamanın içinde okunur. Üye olurken kullanım koşullarını ve KVKK aydınlatma metnini kabul etmiş olursun.</Text>
      </View>
      <Group title="Sözleşmeler ve politikalar" items={[
        { icon: 'file-text', label: 'Kullanım koşulları', sub: 'Üyelik sözleşmesi', go: () => router.push('/hukuki/kullanim' as never) },
        { icon: 'lock', label: 'KVKK aydınlatma metni', sub: 'Kişisel verilerin nasıl işlendiği', go: () => router.push('/hukuki/kvkk' as never) },
        { icon: 'settings', label: 'Çerez politikası', go: () => router.push('/hukuki/cerez' as never) },
        { icon: 'check-square', label: 'İlan yayınlama kuralları', sub: 'Yasaklı ilanlar, doğru bilgi', go: () => router.push('/hukuki/ilan-kurallari' as never) },
        { icon: 'credit-card', label: 'Satış ve ödeme bilgileri', sub: 'Mesafeli satış, ön bilgilendirme', go: () => router.push('/hukuki/satis' as never) },
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
