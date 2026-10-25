import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { configured, photoUrl, supabase, tl, type Row } from '../../lib/supabase';

export default function Listings() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (nextPage: number, query: string) => {
    if (!configured) { setError('Uygulama ayarları eksik (.env dosyası).'); return; }
    const id = ++seq.current;
    setLoading(true); setError('');
    const { data, error: e } = await supabase.rpc('search_listings', { p: { q: query, page: nextPage }, count_only: false });
    if (id !== seq.current) return;
    setLoading(false);
    if (e || !data) { setError('İlanlar yüklenemedi. Bağlantını kontrol et.'); return; }
    const res = data as { total: number; rows: Row[] };
    setTotal(res.total);
    setRows((cur) => (nextPage === 1 ? res.rows : [...cur, ...res.rows]));
    setPage(nextPage);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(1, q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <View style={s.screen}>
      <TextInput style={s.input} placeholder="Marka, model veya parça numarası ara" value={q} onChangeText={setQ} autoCorrect={false} />
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (!loading && rows.length < total) void load(page + 1, q.trim()); }}
        ListEmptyComponent={loading ? null : <Text style={s.empty}>İlan bulunamadı.</Text>}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} /> : null}
        renderItem={({ item }) => {
          const photo = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <Pressable style={s.card} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
              {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, s.noimg]} />}
              <View style={s.body}>
                <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                <Text style={s.price}>{tl(item.price)}</Text>
                <Text style={s.meta}>{item.city}{item.year ? ` · ${item.year}` : ''}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F6' },
  input: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  card: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  img: { width: 110, height: 90 },
  noimg: { backgroundColor: '#e3e3e6' },
  body: { flex: 1, padding: 10, gap: 4 },
  title: { fontWeight: '600', color: '#25272D' },
  price: { fontWeight: '700', color: '#6B1E2E' },
  meta: { color: '#666' },
  err: { color: '#b00020', marginHorizontal: 12 },
  empty: { textAlign: 'center', margin: 24, color: '#666' },
});
