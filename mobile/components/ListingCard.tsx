import { Image, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text } from './LText';
import { Heart, Icon } from './Icon';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from './LoginPrompt';
import { photoUrl, tl, type Row } from '../lib/supabase';
import { color, font, radius, shadow, fixed } from '../lib/theme';

/** İlan kartı: önce büyük fotoğraf, altında başlık, fiyat ve yer/yıl. */
export function ListingCard({ item }: { item: Row }) {
  const { favs, toggleFav } = useApp();
  const { notify } = useLoginPrompt();
  const photo = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const fav = favs.has(item.id);
  const meta = [item.city, item.year].filter(Boolean).join(' · ');
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
      <View>
        {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, s.noimg]}><Icon name="truck" size={40} color={color.muted} /></View>}
        <Pressable
          style={s.heart} hitSlop={8} accessibilityRole="button"
          accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) notify('Favoriler', err, (a) => void a.toggleFav(item.id, item.price)); }}
        >
          <Heart on={fav} size={22} color={fav ? fixed.heart : fixed.mediaInk} />
        </Pressable>
        {item.boosted_until && Date.parse(item.boosted_until) > Date.now() ? (
          <View style={s.boost}><Icon name="trending-up" size={12} color={color.tealInk} /><Text style={s.boostT}>Öne çıkan</Text></View>
        ) : null}
      </View>
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        <View style={s.row}>
          <Text style={s.price}>{tl(item.price)}</Text>
          {meta ? (
            <View style={s.where}>
              <Icon name="map-pin" size={14} color={color.muted} />
              <PlainText style={s.whereText} numberOfLines={1}>{meta}</PlainText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  boost: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.teal, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  boostT: { color: color.tealInk, fontFamily: font.bold, fontSize: 11.5 },
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: color.surface, borderRadius: radius + 6, overflow: 'hidden', ...shadow },
  img: { width: '100%', aspectRatio: 1.6, backgroundColor: color.plate },
  noimg: { alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 8 },
  title: { fontFamily: font.displaySemi, color: color.ink, fontSize: 17.5, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  price: { fontFamily: font.bold, color: color.tealText, fontSize: 21 },
  where: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  whereText: { color: color.muted, fontSize: 14, flexShrink: 1 },
});
