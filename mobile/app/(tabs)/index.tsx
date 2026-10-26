import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { Btn } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { money, type MarketPost, type Provider } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';

const QUICK: [string, string, () => void][] = [
  ['Satılık ilanlar', '🚜', () => router.navigate('/ilanlar')],
  ['Kiralık makineler', '🔑', () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_machine' } })],
  ['Operatör ve ustalar', '👷', () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_operator' } })],
  ['İş talepleri', '📋', () => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })],
  ['Parça talepleri', '🔧', () => router.navigate({ pathname: '/is-agi', params: { kind: 'part_request' } })],
  ['Yedek parça', '⚙', () => router.push('/yedek-parca')],
  ['Şirketler ve filolar', '🏢', () => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })],
  ['İl haritası', '🗺', () => router.push('/harita')],
];
const STEPS: [string, string][] = [
  ['İhtiyacını paylaş', 'Konumu, tarihleri ve neye ihtiyacın olduğunu belirt.'],
  ['Teklifleri karşılaştır', 'Fiyatı, kapsamı ve şirket profilini birlikte değerlendir.'],
  ['Ayrıntıları konuş', 'Özel mesajlarla işi netleştir. Seçim ödeme oluşturmaz.'],
];

export default function Home() {
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [latest, setLatest] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<MarketPost[]>([]);
  const [firms, setFirms] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [l, j, f] = await Promise.all([
      supabase.rpc('search_listings', { p: { q: '', page: 1, categories: [], city: 'Tümü', maxPrice: 6000000, sort: 'new' }, count_only: false }),
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
    ]);
    setError(!!(l.error || j.error || f.error));
    setLatest(((l.data as { rows?: Row[] } | null)?.rows ?? []).slice(0, 6));
    setJobs((j.data ?? []) as MarketPost[]);
    setFirms((f.data ?? []) as Provider[]);
    setBusy(false);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const search = () => router.navigate({ pathname: '/ilanlar', params: { q: q.trim() } });
  const name = (session?.user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? '';
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <Text style={s.eyebrow}>SAHANIN DİJİTAL İŞ AĞI</Text>
        <Text style={s.h1}>{session ? `Merhaba${name ? ', ' + name : ''}, tekrar hoş geldin` : 'Al, sat, kirala. İşini paylaş, fiyat al.'}</Text>
        <Text style={s.lead}>Makine, yedek parça ve işini yapacak hizmeti burada bul.</Text>
        <View style={s.searchRow}>
          <TextInput style={s.search} placeholder="Marka, model veya parça numarası ara" placeholderTextColor="#888" value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search" autoCorrect={false} />
          <Pressable style={s.go} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
        {!session ? <Pressable onPress={() => router.navigate('/hesap')} accessibilityRole="button"><Text style={s.link}>Giriş yap / Kayıt ol →</Text></Pressable> : null}
      </View>

      <Text style={s.h2}>Hızlı keşfet</Text>
      <View style={s.grid}>
        {QUICK.map(([label, icon, go]) => (
          <Pressable key={label} style={s.tile} onPress={go} accessibilityRole="button">
            <Text style={{ fontSize: 24 }}>{icon}</Text>
            <Text style={s.tileText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.h2}>Satılık kategorilerine göz at</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {CATEGORY_GROUPS.map((g) => (
          <Pressable key={g.id} style={s.cat} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: 'group:' + g.id } })} accessibilityRole="button"><Text style={s.catText}>{g.label}</Text></Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={s.err}>Bazı bölümler yüklenemedi. Aşağı çekerek yenileyebilirsin.</Text> : null}
      <View style={s.sectionHead}><Text style={s.h2b}>Satılık ilanlar</Text><Pressable onPress={() => router.navigate('/ilanlar')} accessibilityRole="button"><Text style={s.link2}>Tümünü gör</Text></Pressable></View>
      {latest.map((r) => <ListingCard key={r.id} item={r} />)}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      <View style={s.sectionHead}><Text style={s.h2b}>Yeni iş fırsatları</Text><Pressable onPress={() => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })} accessibilityRole="button"><Text style={s.link2}>Tümünü gör</Text></Pressable></View>
      {jobs.map((p) => (
        <Pressable key={p.id} style={s.card} onPress={() => router.push(`/ag/ilan/${p.id}`)} accessibilityRole="button">
          <Text style={s.cardTitle}>{p.title}</Text>
          <Text style={s.meta}>{[p.category, p.city].filter(Boolean).join(' · ')}</Text>
          <Text style={s.price}>{money(p.price, p.price_unit)}</Text>
        </Pressable>
      ))}
      {!busy && !jobs.length ? <Text style={s.empty}>Bir sonraki işin burada olabilir.</Text> : null}

      <View style={s.sectionHead}><Text style={s.h2b}>Bölgendeki şirketler</Text><Pressable onPress={() => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })} accessibilityRole="button"><Text style={s.link2}>Şirketleri keşfet</Text></Pressable></View>
      {firms.map((f) => (
        <Pressable key={f.user_id} style={s.card} onPress={() => router.push(`/firma/${f.user_id}`)} accessibilityRole="button">
          <Text style={s.cardTitle}>{f.name}</Text>
          <Text style={s.meta}>{f.city}</Text>
          <Text numberOfLines={2}>{f.description}</Text>
        </Pressable>
      ))}

      <Text style={s.h2}>Nasıl çalışır? Üç adım.</Text>
      {STEPS.map(([t, d], i) => (
        <View key={t} style={s.card}><Text style={s.cardTitle}>{i + 1}. {t}</Text><Text>{d}</Text></View>
      ))}

      <View style={{ padding: 12, gap: 8 }}>
        <Text style={s.h2b}>Şirketini sahaya çıkar</Text>
        <Text>Hafriyat şirketin, kamyonların ve makinelerin için tek bir şirket vitrini oluştur.</Text>
        <Btn title="Şirket profili oluştur →" onPress={() => router.push(session ? '/ag/firma-kaydi' : '/hesap' as never)} />
        <Btn ghost title="Güvenli işlem rehberi" onPress={() => router.push('/guven')} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F3' },
  hero: { backgroundColor: '#25272D', padding: 16, gap: 8, borderBottomWidth: 2, borderBottomColor: '#800020' },
  eyebrow: { color: '#D5CDD2', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  lead: { color: '#D5CDD2' },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12 },
  go: { backgroundColor: '#800020', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '700' },
  link: { color: '#fff', fontWeight: '600', textDecorationLine: 'underline' },
  h2: { fontSize: 18, fontWeight: '700', color: '#25272D', marginHorizontal: 12, marginTop: 18, marginBottom: 8 },
  h2b: { fontSize: 18, fontWeight: '700', color: '#25272D' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginTop: 18, marginBottom: 8 },
  link2: { color: '#800020', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  tile: { width: '46%', margin: '2%', backgroundColor: '#fff', borderRadius: 10, padding: 14, gap: 6, borderWidth: 1, borderColor: '#DDD9DC' },
  tileText: { fontWeight: '600', color: '#25272D' },
  cat: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: '#DDD9DC' },
  catText: { color: '#25272D' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 8, gap: 4 },
  cardTitle: { fontWeight: '700', color: '#25272D' },
  meta: { color: '#666' },
  price: { fontWeight: '700', color: '#800020' },
  empty: { color: '#666', marginHorizontal: 12 },
  err: { color: '#b00020', marginHorizontal: 12, marginTop: 8 },
});
