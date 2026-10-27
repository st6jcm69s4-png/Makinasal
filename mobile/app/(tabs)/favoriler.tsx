import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { Btn, Chip, Label } from '../../components/ui';
import { AlertBox, Badge, CardSkeleton } from '../../components/kit';
import { ListingCard } from '../../components/ListingCard';
import { router } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { PART_CATEGORIES } from '../../lib/data';
import { useTabScrollTop } from '../../lib/scrollTop';
import { supabase, type Row } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Fav = Row & { category: string; prev_price: number | string | null; created_at: string };
const COLS = 'id,title,price,prev_price,category,city,year,created_at,listing_photos(path,position)';
const SORTS = [['new', 'Yeni eklenen'], ['asc', 'Fiyat: artan'], ['desc', 'Fiyat: azalan'], ['drop', 'Fiyatı düşenler']] as const;
type Sort = (typeof SORTS)[number][0];

/** Kategori başlığı: makine grubu, yedek parça/lastik ya da diğer. */
function groupOf(category: string) {
  const g = CATEGORY_GROUPS.find((x) => (x.categories as readonly string[]).includes(category));
  if (g) return g.label;
  if ((PART_CATEGORIES as readonly string[]).includes(category)) return 'Yedek parça ve lastik';
  return 'Diğer';
}
const dropped = (r: Fav) => r.prev_price != null && Number(r.prev_price) > Number(r.price);

export default function Favorites() {
  const scroller = useRef<never>(null);
  useTabScrollTop('favoriler', scroller);
  const { session, favs } = useApp();
  const [rows, setRows] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [q, setQ] = useState('');
  const key = [...favs].sort().join(',');

  const load = useCallback(async () => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) { setRows([]); return; }
    setLoading(true); setError('');
    const out: Fav[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const { data, error: e } = await supabase.from('listings').select(COLS).in('id', ids.slice(i, i + 50)).eq('status', 'active').eq('moderation_status', 'approved');
      if (e) { setLoading(false); setError('Favoriler yüklenemedi. Bağlantını kontrol et.'); return; }
      out.push(...((data ?? []) as unknown as Fav[]));
    }
    setRows(out); setLoading(false);
  }, [key]);
  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(groupOf(r.category), (m.get(groupOf(r.category)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const dropCount = rows.filter(dropped).length;

  const sections = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR');
    let list = rows.filter((r) => (!group || groupOf(r.category) === group) && (!term || `${r.title} ${r.city}`.toLocaleLowerCase('tr-TR').includes(term)));
    if (sort === 'drop') list = list.filter(dropped);
    list = [...list].sort((a, b) => sort === 'asc' ? Number(a.price) - Number(b.price) : sort === 'desc' ? Number(b.price) - Number(a.price) : b.created_at.localeCompare(a.created_at));
    const m = new Map<string, Fav[]>();
    for (const r of list) { const g = groupOf(r.category); m.set(g, [...(m.get(g) ?? []), r]); }
    return [...m.entries()].map(([title, data]) => ({ title, data }));
  }, [rows, group, sort, q]);
  const shown = sections.reduce((a, x) => a + x.data.length, 0);

  if (!session) {
    return (
      <View style={s.center}>
        <Icon name="heart" size={34} color={color.accent} />
        <Text style={s.emptyT}>Favorilerin burada toplanır</Text>
        <Text style={s.emptyS}>Beğendiğin ilanları kaydet, fiyatı düşünce haber ver.</Text>
        <Btn title="Giriş yap" onPress={() => router.navigate('/hesap')} />
      </View>
    );
  }

  const head = (
    <View style={{ padding: 12, gap: 10 }}>
      <View style={s.top}>
        <PlainText style={s.count}>{String(rows.length)}</PlainText>
        <View style={{ flex: 1 }}>
          <Label>Kayıtlı ilan</Label>
          {dropCount ? <Badge variant="success" icon="trending-down">{`${dropCount} ilanda fiyat düştü`}</Badge> : <Text style={s.small}>Fiyatı düşen ilan yok</Text>}
        </View>
      </View>
      {rows.length ? (
        <>
          <View style={s.search}>
            <Icon name="search" size={18} color={color.muted} />
            <TextInput style={s.searchInput} placeholder="Favorilerinde ara" placeholderTextColor="#9A949A" value={q} onChangeText={setQ} />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Temizle"><Icon name="x" size={18} color={color.muted} /></Pressable> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip title={`Tümü (${rows.length})`} on={!group} onPress={() => setGroup('')} />
            {groups.map(([g, n]) => <Chip key={g} title={`${g} (${n})`} on={group === g} onPress={() => setGroup(group === g ? '' : g)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            <Label>Sırala</Label>
            {SORTS.map(([k, l]) => <Chip key={k} title={l} on={sort === k} onPress={() => setSort(k)} />)}
          </ScrollView>
        </>
      ) : null}
      {error ? <AlertBox variant="destructive">{error}</AlertBox> : null}
    </View>
  );

  return (
    <SectionList
      ref={scroller}
      style={{ flex: 1, backgroundColor: color.bg }}
      sections={sections}
      keyExtractor={(r) => r.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
      ListHeaderComponent={head}
      renderSectionHeader={({ section }) => (
        <View style={s.sec}>
          <Label style={{ color: color.ink, fontSize: 14, letterSpacing: 0.9 }}>{section.title}</Label>
          <Text style={s.secN}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View>
          {dropped(item) ? <View style={s.dropTag}><Icon name="trending-down" size={13} color={color.good} /><Text style={s.dropText}>Fiyatı düştü</Text></View> : null}
          <ListingCard item={item} />
        </View>
      )}
      ListEmptyComponent={
        loading ? <CardSkeleton count={3} /> : (
          <View style={s.empty}>
            <Text style={s.emptyT}>{rows.length ? 'Bu filtreye uyan favori yok' : 'Henüz favori ilanın yok'}</Text>
            <Text style={s.emptyS}>{rows.length ? 'Filtreyi değiştirmeyi dene.' : 'İlanlardaki kalp simgesine dokunarak buraya ekle.'}</Text>
            {!rows.length ? <Btn title="İlanlara göz at" onPress={() => router.navigate('/ilanlar')} /> : null}
          </View>
        )
      }
      ListFooterComponent={shown && shown !== rows.length ? <Text style={s.foot}>{shown} / {rows.length} ilan gösteriliyor</Text> : null}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: color.navy, padding: 14, borderBottomWidth: 3, borderBottomColor: color.accent },
  count: { color: '#fff', fontFamily: font.labelBold, fontSize: 44, lineHeight: 46, minWidth: 50 },
  small: { color: color.onNavy, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, paddingHorizontal: 10 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16, color: color.ink },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: color.navy, paddingTop: 8, marginTop: 14, marginBottom: 10, marginHorizontal: 12 },
  secN: { color: color.muted, fontFamily: font.label, fontSize: 15 },
  dropTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 12, marginBottom: 4 },
  dropText: { color: color.good, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, padding: 28 },
  emptyT: { fontSize: 17, fontWeight: '700', color: color.ink, textAlign: 'center' },
  emptyS: { color: color.muted, textAlign: 'center' },
  foot: { textAlign: 'center', color: color.muted, margin: 12 },
});
