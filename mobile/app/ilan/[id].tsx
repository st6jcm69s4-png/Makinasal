import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { SITE_URL, photoUrl, supabase, tl } from '../../lib/supabase';

type Detail = {
  id: string; title: string; description: string | null; price: number | string; city: string; year: number | null;
  usage_value: number | null; usage_unit: string | null; brand: string | null; model: string | null;
  listing_photos: { path: string; position: number }[] | null;
};

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { favs, toggleFav } = useApp();
  const [item, setItem] = useState<Detail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    supabase.from('listings')
      .select('id,title,description,price,city,year,usage_value,usage_unit,brand,model,listing_photos(path,position)')
      .eq('id', id).eq('status', 'active').eq('moderation_status', 'approved').maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setState('error'); else if (!data) setState('missing'); else { setItem(data as Detail); setState('ok'); }
      });
    return () => { alive = false; };
  }, [id]);

  if (state === 'loading') return <ActivityIndicator style={{ margin: 32 }} />;
  if (state !== 'ok' || !item) return <Text style={s.msg}>{state === 'missing' ? 'İlan bulunamadı veya yayından kalktı.' : 'İlan yüklenemedi.'}</Text>;
  const photos = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position);
  return (
    <ScrollView style={{ backgroundColor: '#fff' }}>
      <ScrollView horizontal pagingEnabled>
        {photos.length ? photos.map((p) => <Image key={p.path} source={{ uri: photoUrl(p.path) }} style={s.photo} />) : <View style={[s.photo, { backgroundColor: '#e3e3e6' }]} />}
      </ScrollView>
      <View style={s.body}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.price}>{tl(item.price)}</Text>
        <Pressable style={s.favBtn} accessibilityRole="button" onPress={async () => { const err = await toggleFav(item.id, item.price); if (err) Alert.alert('Favoriler', err); }}>
          <Text style={s.favText}>{favs.has(item.id) ? '♥ Favorilerde' : '♡ Favorilere ekle'}</Text>
        </Pressable>
        <Text style={s.meta}>
          {[item.brand, item.model, item.city, item.year, item.usage_value ? `${item.usage_value} ${item.usage_unit ?? ''}` : null].filter(Boolean).join(' · ')}
        </Text>
        {item.description ? <Text style={s.desc}>{item.description}</Text> : null}
        {SITE_URL ? (
          <Pressable style={s.btn} onPress={() => void Linking.openURL(`${SITE_URL}/ilanlar/${item.id}`)} accessibilityRole="button">
            <Text style={s.btnText}>Mesaj ve teklif için web sitesinde aç</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  photo: { width: 390, height: 260 },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#25272D' },
  price: { fontSize: 20, fontWeight: '700', color: '#6B1E2E' },
  meta: { color: '#666' },
  desc: { marginTop: 8, lineHeight: 20 },
  favBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  favText: { color: '#6B1E2E', fontWeight: '600' },
  btn: { marginTop: 16, backgroundColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  msg: { margin: 24, textAlign: 'center' },
});
