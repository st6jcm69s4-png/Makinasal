import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/LText';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { Btn, Chip, common } from '../../components/ui';
import { CITIES } from '../../lib/data';
import { dateLabel, money, networkError, POST_KINDS, PROVIDER_KINDS, RENTAL_MODES, type MarketPost, type PostKind, type Provider } from '../../lib/network';
import { supabase } from '../../lib/supabase';

type Tab = PostKind | 'firma';
const TABS: [Tab, string][] = [['rental_machine', 'Kiralık'], ['rental_operator', 'Operatör / usta'], ['job', 'İşler'], ['part_request', 'Parça talepleri'], ['firma', 'Firmalar']];
const PAGE = 20;

export default function NetworkTab() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const [tab, setTab] = useState<Tab>('rental_machine');
  useEffect(() => {
    if (kind && TABS.some(([k]) => k === kind)) { setPosts([]); setProviders([]); setTab(kind as Tab); }
  }, [kind]);
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true); setError('');
    const term = q.trim().replace(/[%_\\]/g, '');
    if (tab === 'firma') {
      let query = supabase.from('service_providers').select('*').eq('published', true).order('created_at', { ascending: false }).range(p * PAGE, (p + 1) * PAGE);
      if (city) query = query.contains('service_cities', [city]);
      if (term) query = query.ilike('name', `%${term}%`);
      const r = await query;
      setLoading(false);
      if (r.error) { setError(networkError(r.error)); return; }
      const rows = (r.data ?? []) as Provider[];
      setMore(rows.length > PAGE); setPage(p);
      setProviders((cur) => (p === 0 ? rows.slice(0, PAGE) : [...cur, ...rows.slice(0, PAGE)]));
    } else {
      let query = supabase.from('market_posts').select('*').eq('status', 'open').eq('kind', tab).order('created_at', { ascending: false }).range(p * PAGE, (p + 1) * PAGE);
      if (city) query = query.eq('city', city);
      if (term) query = query.ilike('title', `%${term}%`);
      const r = await query;
      setLoading(false);
      if (r.error) { setError(networkError(r.error)); return; }
      const rows = (r.data ?? []) as MarketPost[];
      setMore(rows.length > PAGE); setPage(p);
      setPosts((cur) => (p === 0 ? rows.slice(0, PAGE) : [...cur, ...rows.slice(0, PAGE)]));
    }
  }, [tab, city, q]);
  useEffect(() => { const t = setTimeout(() => void load(0), 300); return () => clearTimeout(t); }, [load]);

  const header = (
    <View style={{ gap: 8, padding: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map(([k, l]) => <Chip key={k} title={l} on={tab === k} onPress={() => { setPosts([]); setProviders([]); setTab(k); }} />)}
      </ScrollView>
      <TextInput style={s.input} placeholder={tab === 'firma' ? 'Firma ara' : 'İlan ara'} value={q} onChangeText={setQ} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Chip title={city || 'Tüm iller'} on={!!city} onPress={() => setSheet(true)} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Btn title={tab === 'firma' ? 'Firma profilim' : 'İlan ver'} onPress={() => router.push(tab === 'firma' ? '/ag/firma-kaydi' : (`/ag/yeni?kind=${tab}` as never))} /></View>
        <View style={{ flex: 1 }}><Btn ghost title="İş ağı hesabım" onPress={() => router.push('/ag/hesabim')} /></View>
      </View>
      {error ? <Text style={common.err}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={common.screen}>
      <FlatList<MarketPost | Provider>
        data={tab === 'firma' ? providers : posts}
        keyExtractor={(i) => ('user_id' in i ? i.user_id : i.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={loading ? null : <Text style={common.empty}>{tab === 'firma' ? 'Firma bulunamadı.' : 'İlan bulunamadı.'}</Text>}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} /> : more ? <View style={{ padding: 12 }}><Btn ghost title="Daha fazla yükle" onPress={() => void load(page + 1)} /></View> : null}
        renderItem={({ item }) => 'user_id' in item ? (
          <Pressable style={[common.card, s.item]} onPress={() => router.push(`/firma/${item.user_id}`)} accessibilityRole="button">
            <Text style={common.title}>{item.name}</Text>
            <Text style={common.meta}>{item.company_category ?? PROVIDER_KINDS[item.kind]} · {item.city}</Text>
            <Text numberOfLines={2}>{item.description}</Text>
          </Pressable>
        ) : (
          <Pressable style={[common.card, s.item]} onPress={() => router.push(`/ag/ilan/${item.id}`)} accessibilityRole="button">
            <Text style={common.title}>{item.title}</Text>
            <Text style={common.meta}>
              {[item.category, item.city, item.rental_mode ? RENTAL_MODES[item.rental_mode as keyof typeof RENTAL_MODES] : '', item.start_date ? dateLabel(item.start_date) : ''].filter(Boolean).join(' · ')}
            </Text>
            <Text style={common.price}>{money(item.price, item.price_unit)}</Text>
          </Pressable>
        )}
      />
      <PickerModal visible={sheet} title="İl" selected={city} options={[{ value: '', label: 'Tüm iller' }, ...CITIES.map((c) => ({ value: c, label: c }))]} onPick={setCity} onClose={() => setSheet(false)} />
    </View>
  );
}
const s = StyleSheet.create({
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: '#DDD9DC' },
  item: { marginHorizontal: 12, marginBottom: 8 },
});
