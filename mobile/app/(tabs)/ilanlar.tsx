import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../../components/Toast';
import { useLoginPrompt } from '../../components/LoginPrompt';
import { CardSkeleton } from '../../components/kit';
import { useTabScrollTop } from '../../lib/scrollTop';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon, type IconName } from '../../components/Icon';
import { SearchBox } from '../../components/SearchBox';
import { PickerModal } from '../../components/PickerModal';
import { advCount, FilterModal, NO_ADV, type Adv } from '../../components/FilterModal';
import { techFilterParams } from '../../lib/techSpecs';
import { CITIES } from '../../lib/data';
import { COORDS, distanceKm } from '../../lib/geo';
import { CATEGORY_GROUPS, categoryLabel, categoryValues } from '../../lib/machineryCatalog';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { ListingCard, type CardVariant } from '../../components/ListingCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configured, supabase, type Row } from '../../lib/supabase';
import { color, font } from '../../lib/theme';
import { tr } from '../../lib/i18n';

function FChip({ icon, label, on, drop, onPress }: { icon: IconName; label: string; on?: boolean; drop?: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Icon name={icon} size={15} color={on ? color.tealInk : color.tealText} />
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{label}</Text>
      {drop ? <Icon name="chevron-down" size={14} color={on ? color.tealInk : color.muted} /> : null}
    </Pressable>
  );
}

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
  const { askLogin } = useLoginPrompt();
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
  const params = useLocalSearchParams<{ q?: string; cat?: string; city?: string; maxPrice?: string; brand?: string; n?: string; adv?: string }>();
  useEffect(() => {
    if (params.q !== undefined) setQ(params.q);
    if (params.cat !== undefined) setCat(params.cat);
    if (params.city) setCity(params.city);
    if (params.maxPrice) setMaxPrice(params.maxPrice);
    if (params.brand !== undefined) setAdv((a) => ({ ...a, brand: params.brand ?? '' }));
    // Kayıtlı aramadan gelen tüm gelişmiş filtreler
    if (params.adv) {
      try {
        const p = JSON.parse(params.adv) as Partial<Adv>;
        setAdv({ ...NO_ADV, ...Object.fromEntries(Object.entries(p).filter(([k]) => k in NO_ADV)) } as Adv);
      } catch { /* bozuk parametre: yok say */ }
    }
  }, [params.q, params.cat, params.city, params.maxPrice, params.brand, params.n, params.adv]);

  async function saveSearch() {
    if (!session) { askLogin('Aramayı kaydedip yeni ilanlardan haberdar olmak için giriş yapman gerekir.'); return; }
    const f = { catRaw: cat, cat: cat && !cat.startsWith('group:') ? cat : 'Tümü', city, maxPrice: Number(maxPrice), q: q.trim(), brand: adv.brand, unit: adv.unit, useMin: adv.useMin, useMax: adv.useMax, yMin: adv.yMin, yMax: adv.yMax, minScore: adv.minScore, incNew: true, ver: adv.ver, hide: adv.hide, takas: adv.takas, near: adv.near, tech: adv.tech };
    // Sunucu yarım saatte bir bu parametrelerle yeni ilan arar ve bildirim gönderir.
    const params = { q: q.trim(), categories: cat ? categoryValues(cat) : [], city, maxPrice: Number(maxPrice), part: cat === 'Yedek parça' || cat === 'Lastik ve jant' || cat === 'group:parts', brand: adv.brand, yMin: adv.yMin, yMax: adv.yMax, useMin: adv.useMin, useMax: adv.useMax, unit: adv.unit, minScore: adv.minScore, incNew: true, ver: adv.ver, hide: adv.hide, takas: adv.takas,
      ...(techFilterParams(adv.tech, cat) ? { tech: techFilterParams(adv.tech, cat) } : {}),
      // Yakınlık filtresi bildirimde de korunsun (yalnızca açıksa, boyutu küçük tutmak için)
      ...(adv.near ? { near: adv.near, distances: Object.fromEntries(Object.keys(COORDS).map((c) => [c, distanceKm(myCity, c) ?? 99999])) } : {}) };
    let { error: e } = await supabase.from('saved_searches').insert({ user_id: session.user.id, query: { f }, params, notify: true });
    if (e && /params|notify/.test(e.message)) ({ error: e } = await supabase.from('saved_searches').insert({ user_id: session.user.id, query: { f } }));
    if (e) Alert.alert('Aramayı kaydet', /limit/i.test(e.message) ? 'Kayıtlı arama sınırına ulaştın. Eskilerden birini sil.' : 'Arama kaydedilemedi. Tekrar dene.');
    else toast('Arama kaydedildi. Bu aramaya uyan yeni ilan gelince sana bildirim göndereceğiz.');
  }
  const [q, setQ] = useState('');
  const [view, setViewState] = useState<CardVariant>('row');
  // Seçilen görünüm hatırlanır
  useEffect(() => { void AsyncStorage.getItem('mk-list-view').then((v) => { if (v === 'grid' || v === 'row') setViewState(v); }).catch(() => undefined); }, []);
  const setView = (v: CardVariant) => { setViewState(v); void AsyncStorage.setItem('mk-list-view', v).catch(() => undefined); };
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
    const { data, error: e } = await supabase.rpc('search_listings', { p: { q: query, page: nextPage, categories: f.cat ? categoryValues(f.cat) : [], city: f.city, maxPrice: Number(f.maxPrice), sort: f.sort, part: f.cat === 'Yedek parça' || f.cat === 'Lastik ve jant' || f.cat === 'group:parts', brand: a.brand, yMin: a.yMin, yMax: a.yMax, useMin: a.useMin, useMax: a.useMax, unit: a.unit, minScore: a.minScore, incNew: true, ver: a.ver, hide: a.hide, takas: a.takas, near: a.near, tech: techFilterParams(a.tech, f.cat), distances: Object.fromEntries(Object.keys(COORDS).map((c) => [c, distanceKm(myCity, c) ?? 99999])) }, count_only: false });
    if (id !== seq.current) return;
    setLoading(false);
    if (e || !data) { setError('İlanlar yüklenemedi. Lütfen sayfayı yenileyin.'); return; }
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
      <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 10 }}><SearchBox value={q} onChangeText={setQ} placeholder="Marka, model veya parça numarası ara" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.chips}>
        <FChip icon="grid" label={cat ? categoryLabel(cat) : 'Kategori'} on={!!cat} drop onPress={() => setSheet('cat')} />
        <FChip icon="map-pin" label={city === 'Tümü' ? 'İl' : city} on={city !== 'Tümü'} drop onPress={() => setSheet('city')} />
        <FChip icon="tag" label={maxPrice === '6000000' ? 'Fiyat' : PRICES.find((p) => p.value === maxPrice)?.label ?? 'Fiyat'} on={maxPrice !== '6000000'} drop onPress={() => setSheet('price')} />
        <FChip icon="sliders" label={advCount(adv, cat) ? `${tr('Filtreler')} (${advCount(adv, cat)})` : 'Filtreler'} on={advCount(adv, cat) > 0} onPress={() => setAdvOpen(true)} />
        <FChip icon="list" label={SORTS.find((o) => o.value === sort)?.label ?? 'Sırala'} drop onPress={() => setSheet('sort')} />
        <FChip icon="bookmark" label="Aramayı kaydet" onPress={() => void saveSearch()} />
        <FChip icon="settings" label="Yedek parça" onPress={() => router.push('/yedek-parca')} />
        <FChip icon="map" label="İllere göre" onPress={() => router.push('/harita')} />
      </ScrollView>
      <PickerModal visible={sheet === 'cat'} title="Kategori" selected={cat} options={[{ value: '', label: 'Tümü' }, ...CATEGORY_GROUPS.map((g) => ({ value: 'group:' + g.id, label: g.label + ' (tümü)' })), ...CATEGORY_GROUPS.flatMap((g) => g.categories).map((c) => ({ value: c, label: c }))]} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={['Tümü', ...CITIES].map((c) => ({ value: c, label: c }))} onPick={setCity} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'price'} title="En yüksek fiyat" selected={maxPrice} options={PRICES} onPick={setMaxPrice} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'sort'} title="Sırala" selected={sort} options={SORTS} onPick={setSort} onClose={() => setSheet(null)} />
      <FilterModal visible={advOpen} value={adv} category={cat} part={isPart} onApply={setAdv} onClose={() => setAdvOpen(false)} />
      {error ? <Text style={s.err}>{error}</Text> : null}
      <View style={s.countRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flex: 1 }}>
          {!loading || rows.length ? <><PlainText style={s.countN}>{String(total)}</PlainText><Text style={s.countT}>ilan</Text></> : null}
        </View>
        {/* Görünüm: liste (fotoğraf solda) veya iki sütunlu ızgara */}
        <View style={s.seg} accessibilityRole="radiogroup">
          {(['row', 'grid'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[s.segBtn, view === v && s.segOn]} accessibilityRole="radio" accessibilityState={{ selected: view === v }} accessibilityLabel={tr(v === 'row' ? 'Liste görünümü' : 'Izgara görünümü')}>
              <Icon name={v === 'row' ? 'list' : 'grid'} size={16} color={view === v ? color.ink : color.muted} />
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        ref={scroller}
        key={view}
        numColumns={view === 'grid' ? 2 : 1}
        columnWrapperStyle={view === 'grid' ? { gap: 12, paddingHorizontal: 12, marginBottom: 12 } : undefined}
        data={rows}
        keyExtractor={(r) => r.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (!loading && rows.length < total) void load(page + 1, q.trim(), { cat, city, maxPrice, sort }, adv); }}
        ListEmptyComponent={loading ? undefined : <Text style={s.empty}>İlan bulunamadı.</Text>}
        ListFooterComponent={loading ? <CardSkeleton count={rows.length ? 1 : 4} /> : undefined}
        renderItem={({ item }) => <ListingCard item={item} variant={view} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, backgroundColor: color.surface, borderRadius: 20, borderWidth: 1, borderColor: color.line },
  chipOn: { backgroundColor: color.teal, borderColor: color.teal },
  chipText: { color: color.ink, fontFamily: font.semi, fontSize: 14, maxWidth: 180 },
  chipTextOn: { color: color.tealInk },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  countN: { color: color.ink, fontFamily: font.bold, fontSize: 19 },
  seg: { flexDirection: 'row', backgroundColor: color.plate, borderRadius: 10, padding: 3 },
  segBtn: { width: 38, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.surface },
  countT: { color: color.muted, fontSize: 14 },
  err: { color: color.bad, marginHorizontal: 16 },
  empty: { textAlign: 'center', margin: 24, color: color.muted },
});
