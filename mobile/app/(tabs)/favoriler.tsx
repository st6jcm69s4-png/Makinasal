import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuestGate } from '../../components/LoginPrompt';
import { Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { Btn, Chip, Label } from '../../components/ui';
import { AlertBox, Badge, CardSkeleton, Tabs } from '../../components/kit';
import { FirmCard, PostCard } from '../../components/NetCards';
import { POST_KINDS, type MarketPost, type Provider } from '../../lib/network';
import { ListingCard } from '../../components/ListingCard';
import { router } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { PART_CATEGORIES } from '../../lib/data';
import { useTabScrollTop } from '../../lib/scrollTop';
import { supabase, type Row } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Net = { id: string; section: string; at: string; title: string; post?: MarketPost; firm?: Provider };
type Top = 'machine' | 'part' | 'net';
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
const isPart = (c: string) => (PART_CATEGORIES as readonly string[]).includes(c);
const NET_SECTION: Record<string, string> = { staff_wanted: 'Eleman ilanları', rental_operator: 'Hazır elemanlar', rental_machine: 'Kiralık makineler', job: 'İş talepleri', part_request: 'Parça talepleri' };
const dropped = (r: Fav) => r.prev_price != null && Number(r.prev_price) > Number(r.price);

export default function Favorites() {
  const scroller = useRef<never>(null);
  useTabScrollTop('favoriler', scroller);
  const { session, favs, netFavs } = useApp();
  const [top, setTop] = useState<Top>('machine');
  const [net, setNet] = useState<Net[]>([]);
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

  const netKey = [...netFavs].sort().join(',');
  const loadNet = useCallback(async () => {
    const keys = netKey ? netKey.split(',') : [];
    const postIds = keys.filter((k) => k.startsWith('post:')).map((k) => k.slice(5));
    const firmIds = keys.filter((k) => k.startsWith('firm:')).map((k) => k.slice(5));
    const [p, f, at] = await Promise.all([
      postIds.length ? supabase.from('market_posts').select('*').in('id', postIds).eq('status', 'open') : Promise.resolve({ data: [], error: null }),
      firmIds.length ? supabase.from('service_providers').select('*').in('user_id', firmIds).eq('published', true) : Promise.resolve({ data: [], error: null }),
      keys.length && session ? supabase.from('network_favorites').select('kind,ref_id,created_at').eq('user_id', session.user.id) : Promise.resolve({ data: [] }),
    ]);
    if (p.error || f.error) { setError('Favoriler yüklenemedi. Bağlantını kontrol et.'); return; }
    const when: Record<string, string> = {};
    for (const r of (at.data ?? []) as { kind: string; ref_id: string; created_at: string }[]) when[`${r.kind}:${r.ref_id}`] = r.created_at;
    setNet([
      ...((p.data ?? []) as MarketPost[]).map((x) => ({ id: 'post:' + x.id, section: NET_SECTION[x.kind] ?? POST_KINDS[x.kind], at: when['post:' + x.id] ?? x.created_at, title: x.title, post: x }) as Net),
      ...((f.data ?? []) as Provider[]).map((x) => ({ id: 'firm:' + x.user_id, section: 'Firmalar', at: when['firm:' + x.user_id] ?? '', title: x.name, firm: x }) as Net),
    ]);
  }, [netKey, session]);
  useEffect(() => { void loadNet(); }, [loadNet]);

  const tabRows = useMemo(() => rows.filter((r) => (top === 'part' ? isPart(r.category) : !isPart(r.category))), [rows, top]);
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of tabRows) m.set(groupOf(r.category), (m.get(groupOf(r.category)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const dropCount = tabRows.filter(dropped).length;

  const sections = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR');
    let list = tabRows.filter((r) => (!group || groupOf(r.category) === group) && (!term || `${r.title} ${r.city}`.toLocaleLowerCase('tr-TR').includes(term)));
    if (sort === 'drop') list = list.filter(dropped);
    list = [...list].sort((a, b) => sort === 'asc' ? Number(a.price) - Number(b.price) : sort === 'desc' ? Number(b.price) - Number(a.price) : b.created_at.localeCompare(a.created_at));
    const m = new Map<string, Fav[]>();
    for (const r of list) { const g = groupOf(r.category); m.set(g, [...(m.get(g) ?? []), r]); }
    return [...m.entries()].map(([title, data]) => ({ title, data }));
  }, [tabRows, group, sort, q]);
  const shown = sections.reduce((a, x) => a + x.data.length, 0);

  const netSections = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR');
    const list = net.filter((n) => (!group || n.section === group) && (!term || n.title.toLocaleLowerCase('tr-TR').includes(term))).sort((a, b) => b.at.localeCompare(a.at));
    const m = new Map<string, Net[]>();
    for (const n of list) m.set(n.section, [...(m.get(n.section) ?? []), n]);
    return [...m.entries()].map(([title, data]) => ({ title, data }));
  }, [net, group, q]);
  const netGroups = useMemo(() => { const m = new Map<string, number>(); for (const n of net) m.set(n.section, (m.get(n.section) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [net]);
  const counts = { machine: rows.filter((r) => !isPart(r.category)).length, part: rows.filter((r) => isPart(r.category)).length, net: net.length };
  const changeTop = (t: Top) => { setTop(t); setGroup(''); setSort('new'); setQ(''); };

  if (!session) {
    return (
      <GuestGate icon="heart" text="Beğendiğin ilanları kaydetmek, fiyatı düşünce görmek için giriş yap." />
    );
  }

  const isNet = top === 'net';
  const total = isNet ? net.length : tabRows.length;
  const chips = isNet ? netGroups : groups;
  const data: { title: string; data: (Fav | Net)[] }[] = isNet ? netSections : sections;
  const noun = top === 'machine' ? 'makine ilanı' : top === 'part' ? 'parça ve lastik ilanı' : 'iş ağı kaydı';

  const head = (
    <View>
      <Tabs value={top} onChange={changeTop} items={[
        { id: 'machine', label: 'Makineler', count: counts.machine, icon: 'truck' },
        { id: 'part', label: 'Parça', count: counts.part, icon: 'tool' },
        { id: 'net', label: 'İş ağı', count: counts.net, icon: 'briefcase' },
      ]} />
      <View style={{ padding: 12, gap: 10 }}>
        <View style={s.top}>
          <PlainText style={s.count}>{String(total)}</PlainText>
          <View style={{ flex: 1, gap: 2 }}>
            <Label style={{ color: color.onNavy }}>{`Kayıtlı ${noun}`}</Label>
            {!isNet && dropCount ? <Badge variant="success" icon="trending-down">{`${dropCount} ilanda fiyat düştü`}</Badge> : <Text style={s.small}>{isNet ? 'Kiralık, eleman, iş ve firmalar' : 'Fiyatı düşen ilan yok'}</Text>}
          </View>
        </View>
        {total ? (
          <>
            <View style={s.search}>
              <Icon name="search" size={18} color={color.muted} />
              <TextInput style={s.searchInput} placeholder="Favorilerinde ara" placeholderTextColor={color.muted} value={q} onChangeText={setQ} />
              {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Temizle"><Icon name="x" size={18} color={color.muted} /></Pressable> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip title={`Tümü (${total})`} on={!group} onPress={() => setGroup('')} />
              {chips.map(([g, n]) => <Chip key={g} title={`${g} (${n})`} on={group === g} onPress={() => setGroup(group === g ? '' : g)} />)}
            </ScrollView>
            {!isNet ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                <Label>Sırala</Label>
                {SORTS.map(([k, l]) => <Chip key={k} title={l} on={sort === k} onPress={() => setSort(k)} />)}
              </ScrollView>
            ) : null}
          </>
        ) : null}
        {error ? <AlertBox variant="destructive">{error}</AlertBox> : null}
      </View>
    </View>
  );

  return (
    <SectionList<Fav | Net, { title: string; data: (Fav | Net)[] }>
      ref={scroller}
      style={{ flex: 1, backgroundColor: color.bg }}
      sections={data}
      keyExtractor={(r) => r.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void Promise.all([load(), loadNet()]).finally(() => setRefreshing(false)); }} />}
      ListHeaderComponent={head}
      renderSectionHeader={({ section }) => (
        <View style={s.sec}>
          <Label style={{ color: color.ink, fontSize: 14, letterSpacing: 0.9 }}>{section.title}</Label>
          <Text style={s.secN}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => 'section' in item ? (
        item.post ? <PostCard p={item.post} /> : item.firm ? <FirmCard p={item.firm} /> : null
      ) : (
        <View>
          {dropped(item) ? <View style={s.dropTag}><Icon name="trending-down" size={13} color={color.good} /><Text style={s.dropText}>Fiyatı düştü</Text></View> : null}
          <ListingCard item={item} />
        </View>
      )}
      ListEmptyComponent={
        loading && !isNet ? <CardSkeleton count={3} /> : (
          <View style={s.empty}>
            <Text style={s.emptyT}>{total ? 'Bu filtreye uyan favori yok' : isNet ? 'İş ağında favorin yok' : top === 'part' ? 'Parça favorin yok' : 'Makine favorin yok'}</Text>
            <Text style={s.emptyS}>{total ? 'Filtreyi değiştirmeyi dene.' : isNet ? 'Kiralık ilanı, eleman ilanı, iş talebi ya da firma sayfasındaki kalbe dokun.' : 'İlanlardaki kalp simgesine dokunarak buraya ekle.'}</Text>
            {!total ? <Btn title={isNet ? 'İş ağına göz at' : 'İlanlara göz at'} onPress={() => router.navigate(isNet ? '/is-agi' : '/ilanlar')} /> : null}
          </View>
        )
      }
      ListFooterComponent={shown && !isNet && shown !== tabRows.length ? <Text style={s.foot}>{shown} / {tabRows.length} ilan gösteriliyor</Text> : null}
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
