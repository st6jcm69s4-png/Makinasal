import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Text } from '../../components/LText';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { useApp } from '../../lib/AppContext';
import { supabase, type Row } from '../../lib/supabase';

const COLS = 'id,title,price,city,year,listing_photos(path,position)';

export default function Favorites() {
  const { session, favs } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = [...favs].sort().join(',');

  const load = useCallback(async () => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) { setRows([]); return; }
    setLoading(true); setError('');
    const out: Row[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const { data, error: e } = await supabase.from('listings').select(COLS).in('id', ids.slice(i, i + 50)).eq('status', 'active').eq('moderation_status', 'approved');
      if (e) { setLoading(false); setError('Favoriler yüklenemedi. Bağlantını kontrol et.'); return; }
      out.push(...((data ?? []) as Row[]));
    }
    setRows(out); setLoading(false);
  }, [key]);
  useEffect(() => { void load(); }, [load]);

  if (!session) {
    return (
      <View style={s.center}>
        <Text style={s.msg}>Favorilerini görmek için giriş yap.</Text>
        <Pressable style={s.btn} onPress={() => router.push('/hesap')} accessibilityRole="button"><Text style={s.btnText}>Giriş yap</Text></Pressable>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingTop: 12 }}
        renderItem={({ item }) => <ListingCard item={item} />}
        ListEmptyComponent={loading ? <ActivityIndicator style={{ margin: 24 }} /> : <Text style={s.msg}>Henüz favori ilanın yok. İlanlardaki ♡ simgesine dokun.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  msg: { textAlign: 'center', color: '#666', margin: 24 },
  err: { color: '#b00020', margin: 12 },
  btn: { backgroundColor: '#800020', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 4 },
  btnText: { color: '#fff', fontWeight: '600' },
});
