import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Heart } from './Icon';
import { Label } from './ui';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from './LoginPrompt';
import { photoUrl, tl, type Row } from '../lib/supabase';
import { color, font, radius } from '../lib/theme';

export function ListingCard({ item }: { item: Row }) {
  const { favs, toggleFav } = useApp();
  const { notify } = useLoginPrompt();
  const photo = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const fav = favs.has(item.id);
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
      <View style={s.top}>
        {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, s.noimg]} />}
        <View style={s.body}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.price}>{tl(item.price)}</Text>
        </View>
        <Pressable
          style={s.heart} hitSlop={8} accessibilityRole="button"
          accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) notify('Favoriler', err, (a) => void a.toggleFav(item.id, item.price)); }}
        >
          <Heart on={fav} size={22} color={fav ? color.accent : color.muted} />
        </Pressable>
      </View>
      <View style={s.strip}>
        <View style={s.cell}><Label>Yıl</Label><Text style={s.val}>{item.year || '–'}</Text></View>
        <View style={[s.cell, s.cellMid]}><Label>İl</Label><Text style={s.val} numberOfLines={1}>{item.city || '–'}</Text></View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, overflow: 'hidden' },
  top: { flexDirection: 'row' },
  img: { width: 112, height: 92 },
  noimg: { backgroundColor: color.plate },
  body: { flex: 1, padding: 10, gap: 4, justifyContent: 'space-between' },
  title: { fontWeight: '600', color: color.ink, fontSize: 16 },
  price: { fontFamily: font.bold, fontWeight: '700', color: color.accent, fontSize: 19 },
  heart: { padding: 10 },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { flex: 1, paddingVertical: 6, paddingHorizontal: 10, gap: 1 },
  cellMid: { borderLeftWidth: 1, borderLeftColor: color.line, flex: 2 },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
});
