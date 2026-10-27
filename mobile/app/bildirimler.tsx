import { useCallback, useState } from 'react';
import { GuestGate } from '../components/LoginPrompt';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';

type Note = { id: string; title: string; body: string; url: string; read_at: string | null; created_at: string };
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function target(url: string): string | null {
  const m = new RegExp(`^/(mesajlar|ilanlar)/(${UUID})$`, 'i').exec(url);
  if (!m) return null;
  return m[1].toLowerCase() === 'mesajlar' ? `/mesaj/${m[2]}` : `/ilan/${m[2]}`;
}

export default function Notifications() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [items, setItems] = useState<Note[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!uid) { setItems([]); return; }
    const { data, error: e } = await supabase.from('notifications').select('id,title,body,url,read_at,created_at').eq('user_id', uid)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
    if (e) { setError('Bildirimler yüklenemedi. Bağlantını kontrol et.'); setItems([]); return; }
    setError(''); setItems((data ?? []) as Note[]);
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function mark(ids: string[]) {
    if (!uid || !ids.length) return;
    const at = new Date().toISOString();
    const { error: e } = await supabase.from('notifications').update({ read_at: at }).eq('user_id', uid).in('id', ids);
    if (!e) setItems((cur) => (cur ?? []).map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? at } : n)));
  }

  if (!session) return <GuestGate icon="bell" text="Bildirimlerini görmek için giriş yap." />;
  if (items === null) return <ActivityIndicator style={{ margin: 32 }} />;
  const unread = items.filter((n) => !n.read_at).map((n) => n.id);
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      {unread.length ? <Pressable onPress={() => void mark(unread)} accessibilityRole="button"><Text style={s.link}>Hepsini okundu işaretle ({unread.length})</Text></Pressable> : null}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz bildirimin yok.</Text>}
        renderItem={({ item: n }) => (
          <Pressable style={[s.card, !n.read_at && s.unread]} accessibilityRole="button" onPress={() => { if (!n.read_at) void mark([n.id]); const t = target(n.url); if (t) router.push(t as never); }}>
            <Text style={s.title}>{n.title}</Text>
            <Text>{n.body}</Text>
            <Text style={s.date}>{new Date(n.created_at).toLocaleString('tr-TR')}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: '#666', margin: 24 },
  err: { color: '#b00020', margin: 12 },
  link: { color: '#800020', fontWeight: '600', margin: 12 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 4, gap: 4 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#800020' },
  title: { fontWeight: '700' },
  date: { color: '#888', fontSize: 12 },
});
