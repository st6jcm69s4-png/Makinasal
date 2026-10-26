import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';

type Row = {
  id: string; title: string; price: number | string; city: string; status: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | null; listing_photos: { path: string; position: number }[] | null;
};
const COLS = 'id,title,price,city,status,moderation_status,listing_photos(path,position)';

function statusText(r: Row) {
  if (r.status === 'sold') return 'Satıldı';
  if (r.moderation_status === 'pending') return 'İncelemede';
  if (r.moderation_status === 'rejected') return 'Reddedildi';
  if (r.status === 'paused') return 'Duraklatıldı';
  return 'Yayında';
}

export default function MyListings() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    const { data, error: e } = await supabase.from('listings').select(COLS).eq('seller_id', uid).neq('status', 'removed').order('created_at', { ascending: false });
    if (e) { setError('İlanların yüklenemedi. Bağlantını kontrol et.'); setRows([]); return; }
    setError(''); setRows((data ?? []) as unknown as Row[]);
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function patch(id: string, status: string) {
    const { error: e } = await supabase.from('listings').update({ status }).eq('id', id);
    if (e) Alert.alert('İlan', e.message.includes('limit') || e.message.includes('limitine') ? 'İlan limitine ulaştın.' : 'İşlem kaydedilemedi.');
    void load();
  }
  function confirm(r: Row, status: string, text: string) {
    Alert.alert(r.title, text, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet', onPress: () => void patch(r.id, status) }]);
  }

  if (!session) return <Text style={s.msg}>İlanlarını görmek için giriş yap.</Text>;
  if (rows === null) return <ActivityIndicator style={{ margin: 32 }} />;
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz ilanın yok.</Text>}
        renderItem={({ item: r }) => {
          const photo = [...(r.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <View style={s.card}>
              <Pressable style={s.top} onPress={() => router.push(`/ilan/${r.id}`)} accessibilityRole="button">
                {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, { backgroundColor: '#e3e3e6' }]} />}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.title} numberOfLines={2}>{r.title}</Text>
                  <Text style={s.price}>{tl(r.price)} · {r.city}</Text>
                  <Text style={s.status}>{statusText(r)}</Text>
                </View>
              </Pressable>
              <View style={s.actions}>
                <Pressable onPress={() => router.push(`/ilan-ver?duzenle=${r.id}`)}><Text style={s.link}>Düzenle</Text></Pressable>
                {r.status === 'active' ? <Pressable onPress={() => confirm(r, 'sold', 'Satıldı olarak işaretlensin mi?')}><Text style={s.link}>Satıldı yap</Text></Pressable> : null}
                {r.status === 'active' ? <Pressable onPress={() => void patch(r.id, 'paused')}><Text style={s.link}>Duraklat</Text></Pressable> : null}
                {r.status === 'paused' ? <Pressable onPress={() => void patch(r.id, 'active')}><Text style={s.link}>Yayına al</Text></Pressable> : null}
                <Pressable onPress={() => confirm(r, 'removed', 'İlan kaldırılsın mı? İşlem ve değerlendirme geçmişi korunur.')}><Text style={[s.link, { color: '#b00020' }]}>Kaldır</Text></Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  msg: { textAlign: 'center', color: '#666', margin: 24 },
  err: { color: '#b00020', margin: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  top: { flexDirection: 'row', gap: 10, padding: 10 },
  img: { width: 90, height: 70, borderRadius: 6 },
  title: { fontWeight: '600', color: '#25272D' },
  price: { color: '#800020', fontWeight: '700' },
  status: { color: '#666' },
  actions: { flexDirection: 'row', gap: 18, padding: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  link: { color: '#800020', fontWeight: '600' },
});
