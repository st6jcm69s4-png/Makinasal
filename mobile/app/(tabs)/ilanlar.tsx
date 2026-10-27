import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/LText';
import { SearchBox } from '../../components/SearchBox';
import { PickerModal } from '../../components/PickerModal';
import { advCount, FilterModal, NO_ADV, type Adv } from '../../components/FilterModal';
import { CITIES } from '../../lib/data';
import { COORDS, distanceKm } from '../../lib/geo';
import { CATEGORY_GROUPS, categoryLabel, categoryValues } from '../../lib/machineryCatalog';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { ListingCard } from '../../components/ListingCard';
import { configured, supabase, type Row } from '../../lib/supabase';

const SORTS = [
  { value: 'rec', label: 'Öne çıkanlar önce' }, { value: 'new', label: 'En yeni ilan' }, { value: 'pa', label: 'Fiyat: artan' },
  { value: 'pd', label: 'Fiyat: azalan' }, { value: 'near', label: 'Bana en yakın' }, { value: 'drop', label: 'Fiyatı düşenler önce' }, { value: 'yd', label: 'Model yılı: yeniden eskiye' },
  { value: 'trust', label: 'Satıcı puanı: yüksek önce' },
];
const PRICES = [
  { value: '6000000', label: 'Tümü' }, { value: '250000', label: '250.000 ₺ ve altı' }, { value: '500000', label: '500.000 ₺ ve altı' },
  { value: '1000000', label: '1.000.000 ₺ ve altı' }, { value: '2500000', label: '2.500.000 ₺ ve altı' }, { value: '5000000', label: '5.000.000 ₺ ve altı' },
];
type Sheet = null | 'cat' | 'city' | 'price' | 'sort';

export default function Listings() {
  const scroller = useRef<never>(null);
  useTabScrollTop('ilanlar', scroller);
  const [cat, setCat] = useState('');
  const [city, setCity] = useState('Tümü');
  const [maxPrice, setMaxPrice] = useState('6000000');
  const [sort, setSort] = useState('rec');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [adv, setAdv] = useState<Adv>(NO_ADV);
  const [advOpen, setAdvOpen] = useState(false);
  const [myCity, setMyCity] = useState('İstanbul');
  const isPart = cat === 'Yedek parça' || cat === 'Lastik ve jant' || cat === 'group:parts';
  const { session } = useApp();
  useEffect(() => {
    if (!session) return;
    void supabase.from('profiles').select('city').eq('id', session.user.id).maybeSingle().then((r) => { const c = (r.data as { city?: string | null } | null)?.city; if (c && COORDS[c]) setMyCity(c); });
  }, [session]);
  const params = useLocalSearchParams<{ q?: string; cat?: string; city?: string; maxPrice?: string; brand?: string; n?: string }>();
  useEffect(() => {
    if (params.q !== undefined) setQ(params.q);
    if (params.cat !== undefined) setCat(params.cat);
    if (params.city) setCity(params.city);
    if (params.maxPrice) setMaxPrice(params.maxPrice);
    if (params.brand !== undefined) setAdv((a) => ({ ...a, brand: params.brand ?? '' }));
  }, [params.q, params.cat, params.city, params.maxPrice, params.brand, params.n]);

  async function saveSearch() {
    if (!session) { Alert.alert('Aramayı kaydet', 'Aramayı kaydetmek için giriş yapmalısın.'); return; }
    const f = { cat: cat && !cat.startsWith('group:') ? cat : 'Tümü', city, maxPrice: Number(maxPrice), q: q.trim(), brand: adv.brand, unit: adv.unit, useMin: adv.useMin, useMax: adv.useMax, yMin: adv.yMin, yMax: adv.yMax, minScore: adv.minScore, incNew: true, ver: adv.ver, hide: adv.hide, takas: adv.takas, near: adv.near };
    const { error: e } = await supabase.from('saved_searches').insert({ user_id: session.user.id, query: { f } });
    Alert.alert('Aramayı kaydet', e ? 'Arama kaydedilemedi. Tekrar dene.' : 'Arama kaydedildi. Hesabım → Kayıtlı aramalar bölümünden görebilirsin.');
  }
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (nextPage: number, query: string, f: { cat: string; city: string; maxPrice: string; sort: string }, a: Adv) => {
    if (!configured) { setError('Uygulama ayarları eksik (.env dosyası).'); return; }
    const id = ++seq.current;
    setLoading(true); setError('');
    const { data, error: e } = await supabase.rpc('search_listings', { p: { q: query, page: nextPage, categories: f.cat ? categoryValues(f.cat) : [], city: f.city, maxPrice: Number(f.maxPrice), sort: f.sort, part: f.cat === 'Yedek parça' || f.cat === 'Lastik ve jant' || f.cat === 'group:parts', brand: a.brand, yMin: a.yMin, yMax: a.yMax, useMin: a.useMin, useMax: a.useMax, unit: a.unit, minScore: a.minScore, incNew: true, ver: a.ver, hide: a.hide, takas: a.takas, near: a.near, distances: Object.fromEntries(Object.keys(COORDS).map((c) => [c, distanceKm(myCity, c) ?? 99999])) }, count_only: false });
    if (id !== seq.current) return;
    setLoading(false);
    if (e || !data) { setError('İlanlar yüklenemedi. Bağlantını kontrol et.'); return; }
    const res = data as { total: number; rows: Row[] };
    setTotal(res.total);
    setRows((cur) => (nextPage === 1 ? res.rows : [...cur, ...res.rows]));
    setPage(nextPage);
  }, [myCity]);

  useEffect(() => {
    const t = setTimeout(() => void load(1, q.trim(), { cat, city, maxPrice, sort }, adv), 350);
    return () => clearTimeout(t);
  }, [q, cat, city, maxPrice, sort, adv, load]);

  return (
    <View style={s.screen}>
      <View style={{ marginHorizontal: 12, marginTop: 12, marginBottom: 8 }}><SearchBox value={q} onChangeText={setQ} placeholder="Marka, model veya parça numarası ara" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.chips}>
        <Pressable style={[s.chip, !!cat && s.chipOn]} onPress={() => setSheet('cat')}><Text style={[s.chipText, !!cat && s.chipTextOn]}>{cat ? categoryLabel(cat) : 'Kategori'}</Text></Pressable>
        <Pressable style={[s.chip, city !== 'Tümü' && s.chipOn]} onPress={() => setSheet('city')}><Text style={[s.chipText, city !== 'Tümü' && s.chipTextOn]}>{city === 'Tümü' ? 'İl' : city}</Text></Pressable>
        <Pressable style={[s.chip, maxPrice !== '6000000' && s.chipOn]} onPress={() => setSheet('price')}><Text style={[s.chipText, maxPrice !== '6000000' && s.chipTextOn]}>{maxPrice === '6000000' ? 'Fiyat' : PRICES.find((p) => p.value === maxPrice)?.label}</Text></Pressable>
        <Pressable style={[s.chip, advCount(adv) > 0 && s.chipOn]} onPress={() => setAdvOpen(true)}><Text style={[s.chipText, advCount(adv) > 0 && s.chipTextOn]}>Filtreler{advCount(adv) ? ` (${advCount(adv)})` : ''}</Text></Pressable>
        <Pressable style={s.chip} onPress={() => void saveSearch()}><Text style={s.chipText}>♡ Aramayı kaydet</Text></Pressable>
        <Pressable style={s.chip} onPress={() => router.push('/yedek-parca')}><Text style={s.chipText}>Yedek parça</Text></Pressable>
        <Pressable style={s.chip} onPress={() => router.push('/harita')}><Text style={s.chipText}>İl haritası</Text></Pressable>
        <Pressable style={s.chip} onPress={() => setSheet('sort')}><Text style={s.chipText}>Sırala: {SORTS.find((o) => o.value === sort)?.label}</Text></Pressable>
      </ScrollView>
      <PickerModal visible={sheet === 'cat'} title="Kategori" selected={cat} options={[{ value: '', label: 'Tümü' }, ...CATEGORY_GROUPS.map((g) => ({ value: 'group:' + g.id, label: g.label + ' (tümü)' })), ...CATEGORY_GROUPS.flatMap((g) => g.categories).map((c) => ({ value: c, label: c }))]} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={['Tümü', ...CITIES].map((c) => ({ value: c, label: c }))} onPick={setCity} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'price'} title="En yüksek fiyat" selected={maxPrice} options={PRICES} onPick={setMaxPrice} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'sort'} title="Sırala" selected={sort} options={SORTS} onPick={setSort} onClose={() => setSheet(null)} />
      <FilterModal visible={advOpen} value={adv} category={cat} part={isPart} onApply={setAdv} onClose={() => setAdvOpen(false)} />
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        ref={scroller}
        data={rows}
        keyExtractor={(r) => r.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (!loading && rows.length < total) void load(page + 1, q.trim(), { cat, city, maxPrice, sort }, adv); }}
        ListEmptyComponent={loading ? null : <Text style={s.empty}>İlan bulunamadı.</Text>}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} /> : null}
        renderItem={({ item }) => <ListingCard item={item} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F3' },
  input: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: '#DDD9DC' },
  chips: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: '#DDD9DC' },
  chipOn: { backgroundColor: '#800020', borderColor: '#800020' },
  chipText: { color: '#25272D' },
  chipTextOn: { color: '#fff' },
  err: { color: '#b00020', marginHorizontal: 12 },
  empty: { textAlign: 'center', margin: 24, color: '#666' },
});
