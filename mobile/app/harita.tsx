import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { common } from '../components/ui';
import { supabase } from '../lib/supabase';

export default function CityMap() {
  const [counts, setCounts] = useState<[string, number][] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void supabase.from('listings').select('city').eq('status', 'active').eq('moderation_status', 'approved').limit(5000).then(({ data, error: e }) => {
      if (e || !data) { setError('İl dağılımı yüklenemedi.'); return; }
      const c: Record<string, number> = {};
      for (const r of data as { city: string }[]) c[r.city] = (c[r.city] ?? 0) + 1;
      setCounts(Object.entries(c).sort((a, b) => b[1] - a[1]));
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
      ListHeaderComponent={<Text style={[common.meta, { padding: 12 }]}>İllere göre ilan dağılımı. Bir ile dokununca o ildeki ilanlar açılır.</Text>}
      ListEmptyComponent={<Text style={common.empty}>Henüz ilan yok.</Text>}
      renderItem={({ item: [city, n] }) => (
        <Pressable style={[common.card, { marginHorizontal: 12, marginBottom: 6 }]} onPress={() => router.push({ pathname: '/', params: { city } })} accessibilityRole="button">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={common.title}>{city}</Text><Text style={common.price}>{n} ilan</Text></View>
          <View style={{ height: 6, backgroundColor: '#eee', borderRadius: 3 }}><View style={{ height: 6, width: `${Math.max(4, (n / max) * 100)}%`, backgroundColor: '#6B1E2E', borderRadius: 3 }} /></View>
        </Pressable>
      )}
    />
  );
}
