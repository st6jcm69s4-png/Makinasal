import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { CardSkeleton } from '../components/kit';
import { timeLeft } from '../components/AuctionBox';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

type Item = { id: string; listing_id: string; title: string; city: string; year: number | null; current_price: number | null; start_price: number; bid_count: number; ends_at: string; photo: string | null };

export default function Auctions() {
  const [rows, setRows] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('active_auctions', { p_limit: 60 });
    if (e) { setError('Açık artırmalar yüklenemedi. Lütfen sayfayı yenileyin.'); setRows([]); return; }
    setError(''); setRows((data ?? []) as Item[]);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  if (rows === null) return <View style={{ flex: 1, backgroundColor: color.bg, padding: 16 }}><CardSkeleton count={3} /></View>;
  return (
    <FlatList
      style={{ backgroundColor: color.bg }}
      data={rows.filter((r) => Date.parse(r.ends_at) > now)}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={color.teal} />}
      ListHeaderComponent={<Text style={s.head}>{error || 'Süresi en yakın biten açık artırmalar önce gösterilir.'}</Text>}
      ListEmptyComponent={
        <View style={s.empty}>
          <View style={s.emptyIcon}><Icon name="award" size={26} color={color.tealText} /></View>
          <Text style={s.emptyT}>Şu an açık artırma yok</Text>
          <Text style={s.emptyS}>İlanını açık artırmaya çıkarmak için İlanlarım'da ilanın ⋮ menüsünden "Açık artırmaya çıkar"ı seç.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const ending = Date.parse(item.ends_at) - now < 3600 * 1000;
        return (
          <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]} onPress={() => router.push(`/ilan/${item.listing_id}`)} accessibilityRole="button">
            {item.photo ? <Image source={{ uri: photoUrl(item.photo) }} style={s.img} /> : <View style={[s.img, { backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' }]}><Icon name="truck" size={28} color={color.muted} /></View>}
            <View style={{ flex: 1, gap: 4 }}>
              <PlainText style={s.title} numberOfLines={2}>{item.title}</PlainText>
              <PlainText style={s.price}>{tl(item.current_price ?? item.start_price)}</PlainText>
              <PlainText style={s.meta} numberOfLines={1}>{`${item.bid_count ? `${item.bid_count} ${tr('teklif')}` : tr('Henüz teklif yok')} · ${item.city}`}</PlainText>
              <View style={[s.time, ending && { backgroundColor: color.badBg }]}>
                <Icon name="clock" size={13} color={ending ? color.bad : color.tealText} />
                <PlainText style={[s.timeT, ending && { color: color.bad }]}>{timeLeft(item.ends_at, now)}</PlainText>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  head: { color: color.muted, fontSize: 13.5, marginHorizontal: 4 },
  card: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  img: { width: 108, height: 96, borderRadius: radius },
  title: { color: color.ink, fontFamily: font.semi, fontSize: 15, lineHeight: 20 },
  price: { color: color.tealText, fontFamily: font.bold, fontSize: 17 },
  meta: { color: color.muted, fontSize: 13 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: color.tealSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  timeT: { color: color.tealText, fontFamily: font.bold, fontSize: 12.5 },
  empty: { alignItems: 'center', gap: 8, padding: 24, marginTop: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  emptyT: { color: color.ink, fontFamily: font.bold, fontSize: 17 },
  emptyS: { color: color.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
