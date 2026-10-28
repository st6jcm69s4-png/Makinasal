import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon, type IconName } from '../../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { Btn, Chip } from '../../components/ui';
import { AlertBox, CardSkeleton } from '../../components/kit';
import { FirmCard, PostCard } from '../../components/NetCards';
import { NetAccountView } from '../../components/NetAccountView';
import { CITIES } from '../../lib/data';
import { dateLabel, money, networkError, PERSONNEL_ROLES, PROVIDER_KINDS, RENTAL_MODES, type MarketPost, type PostKind, type Provider } from '../../lib/network';
import { useTabScrollTop } from '../../lib/scrollTop';
import { supabase } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Tab = PostKind | 'firma';
type Section = 'seek' | 'hire' | 'market';
const SECTIONS: { id: Section; icon: IconName; title: string; sub: string; tabs: [Tab, string][]; cta: [string, string] }[] = [
  { id: 'seek', icon: 'search', title: 'İş arıyorum', sub: 'Açık pozisyonlar', tabs: [['staff_wanted', 'Eleman ilanları']], cta: ['Kendimi tanıt: hizmet ilanı ver', 'rental_operator'] },
  { id: 'hire', icon: 'users', title: 'Eleman arıyorum', sub: 'Operatör, şoför, usta', tabs: [['rental_operator', 'Hazır elemanlar']], cta: ['Eleman ilanı ver', 'staff_wanted'] },
  { id: 'market', icon: 'truck', title: 'Makine ve iş', sub: 'Kiralık, iş, parça', tabs: [['rental_machine', 'Kiralık'], ['job', 'İşler'], ['part_request', 'Parça talepleri'], ['firma', 'Firmalar']], cta: ['İlan ver', ''] },
];
const sectionOf = (t: Tab): Section => (t === 'staff_wanted' ? 'seek' : t === 'rental_operator' ? 'hire' : 'market');
const PAGE = 20;

export default function NetworkTab() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const scroller = useRef<never>(null);
  useTabScrollTop('is-agi', scroller);
  const [tab, setTab] = useState<Tab>('rental_machine');
  useEffect(() => {
    const all: string[] = ['rental_machine', 'rental_operator', 'job', 'part_request', 'staff_wanted', 'firma'];
    if (kind && all.includes(kind)) { setPosts([]); setProviders([]); setTab(kind as Tab); }
  }, [kind]);
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [sheet, setSheet] = useState(false);
  const [acct, setAcct] = useState(false);
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const section = SECTIONS.find((x) => x.id === sectionOf(tab))!;
  const personnel = tab === 'staff_wanted' || tab === 'rental_operator';

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
      if (personnel && role) query = query.eq('personnel_role', role);
      const r = await query;
      setLoading(false);
      if (r.error) { setError(networkError(r.error)); return; }
      const rows = (r.data ?? []) as MarketPost[];
      setMore(rows.length > PAGE); setPage(p);
      setPosts((cur) => (p === 0 ? rows.slice(0, PAGE) : [...cur, ...rows.slice(0, PAGE)]));
    }
  }, [tab, city, q, role, personnel]);
  useEffect(() => { const t = setTimeout(() => void load(0), 300); return () => clearTimeout(t); }, [load]);

  const go = (t: Tab) => { setPosts([]); setProviders([]); setRole(''); setTab(t); };
  const create = () => router.push(tab === 'firma' ? '/ag/firma-kaydi' : (`/ag/yeni?kind=${section.cta[1] || tab}` as never));

  const header = (
    <View>
      <View style={s.switch}>
        {SECTIONS.map((x, i) => {
          const on = x.id === section.id;
          return (
            <Pressable key={x.id} style={[s.seg, i > 0 && s.segL, on && s.segOn]} onPress={() => go(x.tabs[0][0])} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Icon name={x.icon} size={19} color={on ? '#fff' : color.accent} />
              <Text style={[s.segTitle, on && { color: '#fff' }]}>{x.title}</Text>
              <Text style={[s.segSub, on && { color: color.onNavy }]} numberOfLines={1}>{x.sub}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 10, padding: 12 }}>
        {section.tabs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {section.tabs.map(([k, l]) => <Chip key={k} title={l} on={tab === k} onPress={() => go(k)} />)}
          </ScrollView>
        ) : null}
        {personnel ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip title="Tümü" on={!role} onPress={() => setRole('')} />
            {Object.entries(PERSONNEL_ROLES).map(([k, l]) => <Chip key={k} title={l} on={role === k} onPress={() => setRole(k)} />)}
          </ScrollView>
        ) : null}
        <View style={s.searchRow}>
          <Icon name="search" size={18} color={color.muted} />
          <TextInput style={s.input} placeholder={tab === 'firma' ? 'Firma ara' : tab === 'staff_wanted' ? 'Pozisyon ara' : 'İlan ara'} placeholderTextColor={color.muted} value={q} onChangeText={setQ} />
          <Pressable style={s.cityBtn} onPress={() => setSheet(true)} accessibilityRole="button">
            <Icon name="map-pin" size={15} color={city ? color.accent : color.muted} />
            <Text style={[s.cityText, city && { color: color.accentText, fontWeight: '700' }]} numberOfLines={1}>{city || 'Tüm iller'}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 3 }}><Btn title={tab === 'firma' ? 'Firma profilim' : section.cta[0]} onPress={create} /></View>
          <View style={{ flex: 2 }}><Btn ghost title="Hesabım" onPress={() => setAcct(true)} /></View>
        </View>
        {error ? <AlertBox variant="destructive">{error}</AlertBox> : null}
      </View>
    </View>
  );

  const empty = tab === 'firma' ? 'Firma bulunamadı.' : tab === 'staff_wanted' ? 'Şu an açık eleman ilanı yok.' : tab === 'rental_operator' ? 'Bu filtreye uygun eleman bulunamadı.' : 'İlan bulunamadı.';
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <FlatList<MarketPost | Provider>
        ref={scroller}
        data={tab === 'firma' ? providers : posts}
        keyExtractor={(i) => ('user_id' in i ? i.user_id : i.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={loading ? null : <Text style={s.empty}>{empty}</Text>}
        ListFooterComponent={loading ? <CardSkeleton count={(tab === 'firma' ? providers : posts).length ? 1 : 3} /> : more ? <View style={{ padding: 12 }}><Btn ghost title="Daha fazla yükle" onPress={() => void load(page + 1)} /></View> : null}
        renderItem={({ item }) => 'user_id' in item ? <FirmCard p={item} /> : <PostCard p={item} />}
      />
      <Modal visible={acct} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAcct(false)}>
        <View style={{ flex: 1, backgroundColor: color.navy }}>
          <View style={s.sheetBar}>
            <Pressable onPress={() => setAcct(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Geri" style={s.sheetBack}><Icon name="chevron-left" size={28} color="#fff" /></Pressable>
          </View>
          <NetAccountView embedded onNavigate={() => setAcct(false)} />
        </View>
      </Modal>
      <PickerModal visible={sheet} title="İl" selected={city} options={[{ value: '', label: 'Tüm iller' }, ...CITIES.map((c) => ({ value: c, label: c }))]} onPick={setCity} onClose={() => setSheet(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  sheetBack: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 4 },
  sheetTitle: { color: '#fff', fontFamily: font.labelBold, fontSize: 18, letterSpacing: 1 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  switch: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  seg: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 2, alignItems: 'flex-start', borderTopWidth: 3, borderTopColor: 'transparent' },
  segL: { borderLeftWidth: 1, borderLeftColor: color.line },
  segOn: { backgroundColor: color.navy, borderTopColor: color.accent },
  segTitle: { fontSize: 15, fontFamily: font.bold, color: color.ink, marginTop: 2 },
  segSub: { fontSize: 12, color: color.muted },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, paddingLeft: 10 },
  input: { flex: 1, paddingVertical: 11, fontSize: 16, color: color.ink },
  cityBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 120, minHeight: 44, paddingHorizontal: 10, borderLeftWidth: 1, borderLeftColor: color.line },
  cityText: { color: color.muted, fontSize: 14, flexShrink: 1 },
  err: { color: color.bad },
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  roleIcon: { width: 44, height: 44, borderRadius: radius, backgroundColor: color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: color.ink },
  desc: { color: color.muted, fontSize: 14 },
  fresh: { backgroundColor: color.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2 },
  freshText: { color: '#fff', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  cellL: { borderLeftWidth: 1, borderLeftColor: color.line },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
});
