import { Image, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text } from './LText';
import { Heart, Icon } from './Icon';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from './LoginPrompt';
import { getLang, localeOf, tr } from '../lib/i18n';
import { photoUrl, tl, type Row } from '../lib/supabase';
import { color, font, radius, fixed } from '../lib/theme';

/**
 * İlan kartı, üç düzen:
 * - "row" (varsayılan): fotoğraf solda, bilgiler sağda. Arama sonuçları ve listeler (tek ekranda 5-6 ilan).
 * - "grid": iki sütunlu ızgara için dikey kart.
 * - "wide": yatay kaydırmalı vitrin kartı (öne çıkanlar).
 * Makine alıcısının ilk baktığı bilgiler: fiyat, yıl, çalışma saati / km, tonaj, il.
 */
export type CardVariant = 'row' | 'grid' | 'wide';

const num = (n: number) => n.toLocaleString(localeOf(getLang()));
export function specLine(item: Row): string {
  const parts: string[] = [];
  if (item.year) parts.push(String(item.year));
  if (item.usage_value) parts.push(`${num(item.usage_value)} ${item.usage_unit === 'km' ? 'km' : tr('sa')}`);
  const w = item.tech?.operating_weight;
  if (typeof w === 'number') parts.push(`${num(w)} ${tr('ton')}`);
  return parts.join(' · ');
}
/** "Bugün", "Dün", "3 gün", "2 hafta" */
function ago(iso?: string | null): string {
  if (!iso) return '';
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (!Number.isFinite(d) || d < 0) return '';
  if (d === 0) return tr('Bugün');
  if (d === 1) return tr('Dün');
  if (d < 7) return `${d} ${tr('gün')}`;
  if (d < 35) return `${Math.floor(d / 7)} ${tr('hafta')}`;
  return `${Math.floor(d / 30)} ${tr('ay')}`;
}
const isBoosted = (r: Row) => !!r.boosted_until && Date.parse(r.boosted_until) > Date.now();
const priceDrop = (r: Row) => {
  const prev = Number(r.prev_price ?? 0), now = Number(r.price);
  return prev > now && now > 0 ? prev - now : 0;
};

export function ListingCard({ item, variant = 'row' }: { item: Row; variant?: CardVariant }) {
  const { favs, toggleFav } = useApp();
  const { notify } = useLoginPrompt();
  const photo = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const fav = favs.has(item.id);
  const spec = specLine(item);
  const when = ago(item.created_at);
  const drop = priceDrop(item);
  const video = !!(item.video_url || item.video_path);
  const open = () => router.push(`/ilan/${item.id}`);
  const heart = async () => { const err = await toggleFav(item.id, item.price); if (err) notify('Favoriler', err, (a) => void a.toggleFav(item.id, item.price)); };
  const favLabel = fav ? 'Favorilerden çıkar' : 'Favorilere ekle';
  const img = photo
    ? <Image source={{ uri: photoUrl(photo.path) }} style={StyleSheet.absoluteFill} />
    : <View style={[StyleSheet.absoluteFill, s.noimg]}><Icon name="truck" size={variant === 'row' ? 30 : 40} color={color.muted} /></View>;
  const boostTag = isBoosted(item) ? <View style={s.boost}><Text style={s.boostT}>Öne çıkan</Text></View> : null;
  const videoTag = video ? <View style={s.video} accessibilityLabel={tr('Videolu')}><Icon name="play" size={11} color={fixed.onMedia} /></View> : null;

  if (variant === 'row') {
    return (
      <Pressable style={({ pressed }) => [s.row, pressed && s.pressed]} onPress={open} accessibilityRole="button">
        <View style={s.rowImg}>{img}{boostTag}{videoTag}</View>
        <View style={s.rowBody}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
            <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
            <Pressable onPress={() => void heart()} hitSlop={10} style={s.rowHeart} accessibilityRole="button" accessibilityLabel={tr(favLabel)}>
              <Heart on={fav} size={20} color={fav ? fixed.heart : color.muted} />
            </Pressable>
          </View>
          {spec ? <PlainText style={s.meta} numberOfLines={1}>{spec}</PlainText> : null}
          <PlainText style={s.meta} numberOfLines={1}>{[item.city, when].filter(Boolean).join(' · ')}</PlainText>
          <View style={{ flex: 1 }} />
          <View style={s.priceRow}>
            <PlainText style={s.rowPrice} numberOfLines={1}>{tl(item.price)}</PlainText>
            {drop ? <View style={s.drop}><PlainText style={s.dropT}>{`↓ ${tl(drop)}`}</PlainText></View> : null}
          </View>
        </View>
      </Pressable>
    );
  }

  const wide = variant === 'wide';
  return (
    <Pressable style={({ pressed }) => [s.card, wide ? s.wide : s.grid, pressed && s.pressed]} onPress={open} accessibilityRole="button">
      <View style={[s.cardImg, wide ? { height: 124 } : { aspectRatio: 4 / 3 }]}>
        {img}{boostTag}{videoTag}
        <Pressable onPress={() => void heart()} hitSlop={8} style={s.heart} accessibilityRole="button" accessibilityLabel={tr(favLabel)}>
          <Heart on={fav} size={wide ? 20 : 18} color={fav ? fixed.heart : fixed.mediaInk} />
        </Pressable>
        {drop ? <View style={[s.drop, s.dropOnImg]}><Text style={[s.dropT, { color: fixed.onMedia }]}>Fiyat düştü</Text></View> : null}
      </View>
      <View style={s.cardBody}>
        <PlainText style={wide ? s.widePrice : s.gridPrice} numberOfLines={1}>{tl(item.price)}</PlainText>
        <Text style={wide ? s.wideTitle : s.gridTitle} numberOfLines={2}>{item.title}</Text>
        <PlainText style={s.meta} numberOfLines={1}>{[spec, item.city].filter(Boolean).join(' · ')}</PlainText>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  noimg: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.plate },
  boost: { position: 'absolute', left: 6, top: 6, backgroundColor: color.teal, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  boostT: { color: color.tealInk, fontFamily: font.bold, fontSize: 11 },
  video: { position: 'absolute', right: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(20,20,18,0.7)', alignItems: 'center', justifyContent: 'center' },
  meta: { color: color.muted, fontSize: 12 },
  drop: { backgroundColor: color.goodBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  dropT: { color: color.good, fontFamily: font.textBold, fontSize: 11.5 },
  dropOnImg: { position: 'absolute', left: 8, bottom: 8, backgroundColor: color.good },

  // Satır kartı
  row: { flexDirection: 'row', gap: 10, padding: 8, marginHorizontal: 12, marginBottom: 8, backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  rowImg: { width: 116, height: 92, borderRadius: radius, overflow: 'hidden', backgroundColor: color.plate },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { flex: 1, fontFamily: font.displaySemi, color: color.ink, fontSize: 15.5, lineHeight: 19 },
  rowHeart: { width: 30, height: 30, marginTop: -4, marginRight: -4, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowPrice: { fontFamily: font.bold, color: color.tealText, fontSize: 18.5 },

  // Izgara ve vitrin kartı
  card: { backgroundColor: color.surface, borderRadius: radius + 4, overflow: 'hidden', borderWidth: 1, borderColor: color.line },
  grid: { flex: 1 },
  wide: { width: 208 },
  cardImg: { width: '100%', backgroundColor: color.plate },
  heart: { position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { paddingHorizontal: 9, paddingTop: 7, paddingBottom: 9, gap: 2 },
  gridPrice: { fontFamily: font.bold, color: color.tealText, fontSize: 17 },
  gridTitle: { fontFamily: font.displaySemi, color: color.ink, fontSize: 14, lineHeight: 17, minHeight: 34 },
  widePrice: { fontFamily: font.bold, color: color.tealText, fontSize: 18 },
  wideTitle: { fontFamily: font.displaySemi, color: color.ink, fontSize: 15, lineHeight: 18, minHeight: 36 },
});
