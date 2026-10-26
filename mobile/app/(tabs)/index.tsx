import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { configured, supabase, type Row } from '../../lib/supabase';

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
        renderItem={({ item }) => <ListingCard item={item} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F6' },
  input: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  err: { color: '#b00020', marginHorizontal: 12 },
  empty: { textAlign: 'center', margin: 24, color: '#666' },
});
