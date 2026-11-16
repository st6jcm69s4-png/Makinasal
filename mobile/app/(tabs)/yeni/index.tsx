import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../../components/LText';
import { Icon, type IconName } from '../../../components/Icon';
import { Group } from '../../../components/Rows';
import { useApp } from '../../../lib/AppContext';
import { useLang } from '../../../lib/lang';
import { color, font } from '../../../lib/theme';

/**
 * "İlan ver" sekmesi. Apple yönergesi: sekme bir eylem değil, bir yerdir.
 * Burada ne tür ilan verileceği seçilir; seçilen form ana yığında açılır.
 */
type Choice = { icon: IconName; title: string; sub: string; to: string };
const MAIN: Choice = { icon: 'truck', title: 'Satılık ilan ver', sub: 'İş makinesi, kamyon, vinç, yedek parça veya lastik', to: '/ilan-ver' };
const OTHERS: Choice[] = [
  { icon: 'calendar', title: 'Kiralık makine veya araç', sub: 'Günlük, aylık, operatörlü ya da sadece makine', to: '/ag/yeni?kind=rental_machine' },
  { icon: 'users', title: 'Eleman arıyorum', sub: 'Operatör, şoför veya usta ilanı', to: '/ag/yeni?kind=staff_wanted' },
  { icon: 'clipboard', title: 'İş talebi', sub: 'Hafriyat, nakliye, vinç hizmeti için teklif al', to: '/ag/yeni?kind=job' },
  { icon: 'search', title: 'Parça arıyorum', sub: 'Aradığın parçayı yaz, satıcılar teklif versin', to: '/ag/yeni?kind=part_request' },
  { icon: 'user-check', title: 'Kendimi tanıtmak istiyorum', sub: 'Operatör, şoför veya usta olarak iş bul', to: '/ag/tanit' },
];

function Big({ c }: { c: Choice }) {
  return (
    <Pressable onPress={() => router.push(c.to as never)} style={({ pressed }) => [s.big, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
      <View style={s.bigIcon}><Icon name={c.icon} size={26} color={color.tealInk} /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.bigTitle}>{c.title}</Text>
        <Text style={s.bigSub}>{c.sub}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={color.tealInk} />
    </Pressable>
  );
}

export default function NewListing() {
  useLang();
  const { session } = useApp();
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={s.body} contentInsetAdjustmentBehavior="automatic">
      <Big c={MAIN} />
      <Group title="İş Ağı'na ilan ver" items={OTHERS.map((c, i) => ({ icon: c.icon, tint: i === 0 ? 'accent' : i === 1 ? 'green' : i === 2 ? 'ink' : i === 3 ? 'purple' : 'gold', label: c.title, sub: c.sub, go: () => router.push(c.to as never) }))} />
      <Group
        title="İlanların"
        footer={session ? undefined : 'İlan vermek ücretsizdir. Formu doldurmadan önce giriş yapman istenir.'}
        items={[
          { icon: 'list', tint: 'gray', label: 'İlanlarım', go: () => router.push('/ilanlarim') },
          { icon: 'book-open', tint: 'gray', label: 'İyi ilan nasıl verilir?', sub: 'Fotoğraf, açıklama ve fiyat ipuçları', go: () => router.push('/rehber') },
          { icon: 'check-square', tint: 'gray', label: 'İlan yayınlama kuralları', go: () => router.push('/hukuki/ilan-kurallari' as never) },
        ]}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 24 },
  big: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, backgroundColor: color.teal },
  bigIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bigTitle: { color: color.tealInk, fontFamily: font.bold, fontSize: 20 },
  bigSub: { color: color.tealInk, opacity: 0.85, fontSize: 14, lineHeight: 19 },
});
