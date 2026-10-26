import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, tl, type Row } from '../lib/supabase';

export function ListingCard({ item }: { item: Row }) {
  const { favs, toggleFav } = useApp();
  const photo = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const fav = favs.has(item.id);
  return (
    <Pressable style={s.card} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
      {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, s.noimg]} />}
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        <Text style={s.price}>{tl(item.price)}</Text>
        <Text style={s.meta}>{item.city}{item.year ? ` · ${item.year}` : ''}</Text>
      </View>
      <Pressable
        style={s.heart}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) Alert.alert('Favoriler', err); }}
      >
        <Text style={[s.heartText, fav && { color: '#800020' }]}>{fav ? '♥' : '♡'}</Text>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  img: { width: 110, height: 90 },
  noimg: { backgroundColor: '#e3e3e6' },
  body: { flex: 1, padding: 10, gap: 4 },
  title: { fontWeight: '600', color: '#25272D' },
  price: { fontWeight: '700', color: '#800020' },
  meta: { color: '#666' },
  heart: { padding: 10, justifyContent: 'flex-start' },
  heartText: { fontSize: 24, color: '#999' },
});
