import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { supabase } from '../../lib/supabase';

type Thread = { id: string; title: string; other: string; created_at: string };

export default function Messages() {
  const { session } = useApp();
  const me = session?.user.id;
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!me) { setThreads([]); return; }
    const { data, error: e } = await supabase.from('threads')
      .select('id,buyer_id,seller_id,created_at,listings(title)')
      .or(`buyer_id.eq.${me},seller_id.eq.${me}`).order('created_at', { ascending: false });
    if (e) { setError('Mesajlar yüklenemedi. Bağlantını kontrol et.'); setThreads([]); return; }
    setError('');
    const list = (data ?? []) as unknown as { id: string; buyer_id: string; seller_id: string; created_at: string; listings: { title: string } | { title: string }[] | null }[];
    const otherIds = [...new Set(list.map((t) => (t.buyer_id === me ? t.seller_id : t.buyer_id)))];
    const names: Record<string, string> = {};
    if (otherIds.length) {
      const p = await supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', otherIds);
      for (const r of (p.data ?? []) as { id: string; full_name: string | null; store_name: string | null; is_store: boolean | null }[]) {
        names[r.id] = (r.is_store && r.store_name) || r.full_name || 'Kullanıcı';
      }
    }
    setThreads(list.map((t) => {
      const l = Array.isArray(t.listings) ? t.listings[0] : t.listings;
      return { id: t.id, title: l?.title ?? 'İlan', other: names[t.buyer_id === me ? t.seller_id : t.buyer_id] ?? 'Kullanıcı', created_at: t.created_at };
    }));
  }, [me]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  if (!session) {
    return (
      <View style={s.center}>
        <Text style={s.msg}>Mesajlarını görmek için giriş yap.</Text>
        <Pressable style={s.btn} onPress={() => router.push('/hesap')} accessibilityRole="button"><Text style={s.btnText}>Giriş yap</Text></Pressable>
      </View>
    );
  }
  if (threads === null) return <ActivityIndicator style={{ margin: 32 }} />;
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingTop: 12 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz mesajın yok. Bir ilanda "Mesaj gönder"e dokun.</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => router.push(`/mesaj/${item.id}`)} accessibilityRole="button">
            <Text style={s.other}>{item.other}</Text>
            <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  msg: { textAlign: 'center', color: '#666', margin: 24 },
  err: { color: '#b00020', margin: 12 },
  row: { marginHorizontal: 12, marginBottom: 8, padding: 14, backgroundColor: '#fff', borderRadius: 8, gap: 2 },
  other: { fontWeight: '700', color: '#25272D' },
  title: { color: '#666' },
  btn: { backgroundColor: '#800020', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
});
