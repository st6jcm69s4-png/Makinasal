import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/LText';
import { router, useLocalSearchParams } from 'expo-router';
import { openSuggestion, SearchBox } from '../components/SearchBox';
import { ListingCard } from '../components/ListingCard';
import { PickerModal } from '../components/PickerModal';
import { Btn, Chip, common } from '../components/ui';
import { CITIES, MACHINE_CATEGORIES } from '../lib/data';
import { brandsForCategory } from '../lib/machineryCatalog';
import { partGroupLabel, partGroupsFor, partsSearchText } from '../lib/parts';
import { supabase, type Row } from '../lib/supabase';

const PAGE = 24;
export default function Parts() {
  const [equipment, setEquipment] = useState('');
  const [group, setGroup] = useState('');
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const params = useLocalSearchParams<{ part?: string; equipment?: string; brand?: string; n?: string }>();
  useEffect(() => {
    if (params.equipment) setEquipment(params.equipment);
    if (params.part) setGroup(params.part);
    if (params.brand) setBrand(params.brand);
  }, [params.part, params.equipment, params.brand, params.n]);
  const [sheet, setSheet] = useState<null | 'eq' | 'group' | 'city' | 'brand'>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (page: number) => {
    const id = ++seq.current;
    setLoading(true); setError('');
    let query = supabase.from('listings')
      .select('id,title,price,city,year,listing_photos(path,position)', { count: 'exact' })
      .eq('status', 'active').eq('moderation_status', 'approved')
      .in('category', ['Yedek parça', 'Lastik ve jant'])
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (equipment) query = query.eq('equipment_category', equipment);
    if (group === 'tires') query = query.or('part_group.eq.tires,category.eq.Lastik ve jant');
    else if (group) query = query.eq('part_group', group);
    const b = brand.trim().replace(/[%_\\,()]/g, '');
    if (b) query = query.ilike('brand', b);
    if (city) query = query.eq('city', city);
    const s = partsSearchText(q).replace(/[,()]/g, ' ');
    if (s) query = query.or(`title.ilike.%${s}%,spec.ilike.%${s}%,compat.ilike.%${s}%`);
    const r = await query;
    if (id !== seq.current) return;
    setLoading(false);
    if (r.error) { setError('Parça ilanları yüklenemedi. Tekrar dene.'); if (page === 0) { setRows([]); setTotal(0); } return; }
    const data = (r.data ?? []) as unknown as Row[];
    setTotal(r.count ?? 0);
    setRows((cur) => (page === 0 ? data : [...cur, ...data]));
  }, [equipment, group, brand, city, q]);
  useEffect(() => { const t = setTimeout(() => void load(0), 350); return () => clearTimeout(t); }, [load]);

  const header = (
    <View style={{ padding: 12, gap: 8 }}>
      <Text style={common.meta}>Makine veya aracını seç, ihtiyacın olan parçayı bul.</Text>
      <SearchBox
        value={q}
        onChangeText={setQ}
        scope="parts"
        placeholder="Parça adı veya numarası (pompa, filtre, A10VO71…)"
        onPick={(it) => {
          const key = it.id.slice(it.id.indexOf(':') + 1);
          if (it.id.startsWith('part:')) { setGroup(key); setQ(''); }
          else if (it.id.startsWith('category:')) { setEquipment(key); setGroup(''); setQ(''); }
          else if (it.id.startsWith('brand:')) { setBrand(key); setQ(''); }
          else openSuggestion(it);
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip title={equipment || 'Makine / araç'} on={!!equipment} onPress={() => setSheet('eq')} />
        <Chip title={group ? partGroupLabel(group) : 'Parça grubu'} on={!!group} onPress={() => setSheet('group')} />
        <Chip title={brand || 'Marka'} on={!!brand} onPress={() => setSheet('brand')} />
        <Chip title={city || 'İl'} on={!!city} onPress={() => setSheet('city')} />
        <Chip title="Temizle" onPress={() => { setEquipment(''); setGroup(''); setBrand(''); setCity(''); setQ(''); }} />
      </ScrollView>
      <Btn title="Parça ilanı ver" onPress={() => router.push('/ilan-ver')} />
      <Text style={common.meta}>{loading ? 'Yükleniyor…' : `${total} ilan`}</Text>
      {error ? <Text style={common.err}>{error}</Text> : null}
    </View>
  );
  return (
    <View style={common.screen}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ListingCard item={item} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (!loading && rows.length < total) void load(Math.ceil(rows.length / PAGE)); }}
        ListEmptyComponent={loading ? null : (
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={common.empty}>Bu seçimde henüz ilan yok. Aradığın parça için İş Ağı'nda talep açabilirsin.</Text>
            <Btn ghost title="Aradığım parçayı paylaş" onPress={() => router.push('/ag/yeni?kind=part_request' as never)} />
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} /> : null}
      />
      <PickerModal visible={sheet === 'eq'} title="Makine veya araç" selected={equipment} options={[{ value: '', label: 'Tümü' }, ...MACHINE_CATEGORIES.map((c) => ({ value: c, label: c }))]} onPick={(v) => { setEquipment(v); setGroup(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'group'} title="Parça grubu" selected={group} options={[{ value: '', label: 'Tümü' }, ...partGroupsFor(equipment).map((g) => ({ value: g.id, label: g.label }))]} onPick={setGroup} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'brand'} title="Marka" searchable allowCustom selected={brand} options={[{ value: '', label: 'Tümü' }, ...brandsForCategory(equipment).map((b) => ({ value: b, label: b }))]} onPick={setBrand} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={[{ value: '', label: 'Tümü' }, ...CITIES.map((c) => ({ value: c, label: c }))]} onPick={setCity} onClose={() => setSheet(null)} />
    </View>
  );
}
