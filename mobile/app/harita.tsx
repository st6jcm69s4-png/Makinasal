import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { common } from '../components/ui';
import { supabase } from '../lib/supabase';
import { color } from '../lib/theme';

export default function CityMap() {
  const [counts, setCounts] = useState<[string, number][] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    // Sayım sunucuda yapılır; ilan sayısı ne kadar büyük olursa olsun doğru sonuç verir.
    void supabase.rpc('listing_city_counts').then(({ data, error: e }) => {
      if (e || !data) { setError('İl dağılımı yüklenemedi. Lütfen sayfayı yenileyin.'); return; }
      setCounts((data as { city: string; n: number }[]).map((r) => [r.city, Number(r.n)] as [string, number]));
    });
  }, []);
  if (error) return <Text style={common.empty}>{error}</Text>;
  if (!counts) return <ActivityIndicator style={{ margin: 24 }} />;
  const max = Math.max(1, ...counts.map(([, n]) => n));
  return (
    <FlatList
      style={common.screen}
      data={counts}
      keyExtractor={([c]) => c}
      ListHeaderComponent={<Text style={[common.meta, { padding: 12 }]}>Yayındaki ilanların illere göre sayısı. Bir ile dokununca o ildeki ilanlar açılır.</Text>}
      ListEmptyComponent={<Text style={common.empty}>Henüz ilan yok.</Text>}
      renderItem={({ item: [city, n] }) => (
        <Pressable style={[common.card, { marginHorizontal: 12, marginBottom: 6 }]} onPress={() => router.push({ pathname: '/ilanlar', params: { city } })} accessibilityRole="button">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={common.title}>{city}</Text><Text style={common.price}>{n} ilan</Text></View>
          <View style={{ height: 6, backgroundColor: color.plate, borderRadius: 3 }}><View style={{ height: 6, width: `${Math.max(4, (n / max) * 100)}%`, backgroundColor: color.accent, borderRadius: 3 }} /></View>
        </Pressable>
      )}
    />
  );
}
