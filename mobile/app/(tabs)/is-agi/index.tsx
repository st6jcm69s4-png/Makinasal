import { SwipeTabs } from '../../../components/SwipeTabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UnderlineTabs } from '../../../components/UnderlineTabs';
import { tr } from '../../../lib/i18n';
import { ChoiceRow, ExpandChoice } from '../../../components/ExpandChoice';
import { PlainText, Text, TextInput } from '../../../components/LText';
import { Icon, type IconName } from '../../../components/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../../components/PickerModal';
import { Btn, Chip } from '../../../components/ui';
import { AlertBox, CardSkeleton } from '../../../components/kit';
import { FirmCard, PostCard } from '../../../components/NetCards';
import { NetAccountView } from '../../../components/NetAccountView';
import { CITIES } from '../../../lib/data';
import { dateLabel, money, networkError, PERSONNEL_ROLES, PROVIDER_KINDS, RENTAL_MODES, type MarketPost, type PostKind, type Provider } from '../../../lib/network';
import { useTabScrollTop } from '../../../lib/scrollTop';
import { supabase } from '../../../lib/supabase';
import { NoSwipe } from '../../../components/NoSwipe';
import { color, font, radius } from '../../../lib/theme';

type Tab = PostKind | 'firma';
type Section = 'seek' | 'hire' | 'market';
const SECTIONS: { id: Section; icon: IconName; title: string; sub: string; tabs: [Tab, string][]; cta: [string, string] }[] = [
  { id: 'seek', icon: 'search', title: 'İş arıyorum', sub: 'Açık pozisyonlar', tabs: [['staff_wanted', 'Eleman ilanları']], cta: ['Kendini tanıt', 'rental_operator'] },
  { id: 'hire', icon: 'users', title: 'Eleman arıyorum', sub: 'Operatör, şoför, usta', tabs: [['rental_operator', 'Hazır elemanlar']], cta: ['Eleman ilanı ver', 'staff_wanted'] },
  { id: 'market', icon: 'truck', title: 'Makine ve iş', sub: 'Kiralık, iş, parça', tabs: [['rental_machine', 'Kiralık'], ['job', 'İşler'], ['part_request', 'Parça talepleri'], ['firma', 'Firmalar']], cta: ['İlan ver', ''] },
];
const sectionOf = (t: Tab): Section => (t === 'staff_wanted' ? 'seek' : t === 'rental_operator' ? 'hire' : 'market');
const PAGE = 20;

/*
 * Üstteki üç amaç kutusu (components/ExpandChoice): seçilen kutu yukarı doğru uzayıp uzunlamasına
 * dikdörtgene dönüşür, diğerleri hafifçe küçülür. Seçiliyken altta "Göster" oku belirir.
 */
function SectionCard({ on, icon, title, sub, onPress }: { on: boolean; icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <ExpandChoice on={on} onPress={onPress} height={112} tallHeight={156} grow={1.22} style={s.seg} onStyle={s.segOn}>
      <Icon name={icon} size={on ? 24 : 19} color={on ? color.tealInk : color.tealText} />
      <View style={{ flex: 1 }} />
      <Text style={[s.segTitle, on && { color: color.tealInk }]} numberOfLines={2}>{title}</Text>
      <Text style={[s.segSub, on && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={on ? 2 : 1}>{sub}</Text>
    </ExpandChoice>
  );
}

function NetworkTabScreen() {
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
      let query = supabase.from('service_providers').select('*').eq('published', true).order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).range(p * PAGE, (p + 1) * PAGE);
      if (city) query = query.contains('service_cities', [city]);
      if (term) query = query.ilike('name', `%${term}%`);
      const r = await query;
      setLoading(false);
      if (r.error) { setError(networkError(r.error)); return; }
      const rows = (r.data ?? []) as Provider[];
      setMore(rows.length > PAGE); setPage(p);
      setProviders((cur) => (p === 0 ? rows.slice(0, PAGE) : [...cur, ...rows.slice(0, PAGE)]));
    } else {
      let query = supabase.from('market_posts').select('*').eq('status', 'open').eq('kind', tab).order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).range(p * PAGE, (p + 1) * PAGE);
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

  const insets = useSafeAreaInsets();
  // iPhone'da sekme çubuğu içeriğin üstünde yüzer; düğme onun üstünde durur
  const fabBottom = Platform.OS === 'ios' ? insets.bottom + 62 : 16;
  const go = (t: Tab) => { setPosts([]); setProviders([]); setRole(''); setTab(t); };
  const create = () => router.push(tab === 'firma' ? '/ag/firma-kaydi' : section.cta[1] === 'rental_operator' ? ('/ag/tanit' as never) : (`/ag/yeni?kind=${section.cta[1] || tab}` as never));

  const header = (
    <View>
      <ChoiceRow style={s.switch}>
        {SECTIONS.map((x) => (
          <SectionCard key={x.id} on={x.id === section.id} icon={x.icon} title={x.title} sub={x.sub} onPress={() => go(x.tabs[0][0])} />
        ))}
      </ChoiceRow>
      {section.tabs.length > 1 ? <UnderlineTabs tabs={section.tabs} value={tab} onChange={go} /> : null}
      <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        {personnel ? (
          <NoSwipe><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: -6 }} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
            <Chip title="Tümü" on={!role} onPress={() => setRole('')} />
            {Object.entries(PERSONNEL_ROLES).map(([k, l]) => <Chip key={k} title={l} on={role === k} onPress={() => setRole(k)} />)}
          </ScrollView></NoSwipe>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[s.searchRow, { flex: 1 }]}>
            <Icon name="search" size={18} color={color.muted} />
            <TextInput style={s.input} placeholder={tab === 'firma' ? 'Firma ara' : tab === 'staff_wanted' ? 'Pozisyon ara' : 'İlan ara'} placeholderTextColor={color.muted} value={q} onChangeText={setQ} />
            <Pressable style={s.cityBtn} onPress={() => setSheet(true)} accessibilityRole="button">
              <Icon name="map-pin" size={15} color={city ? color.tealText : color.muted} />
              <Text style={[s.cityText, city && { color: color.tealText, fontWeight: '700' }]} numberOfLines={1}>{city || 'Tüm iller'}</Text>
            </Pressable>
          </View>
          <Pressable style={({ pressed }) => [s.acctBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]} onPress={() => setAcct(true)} accessibilityRole="button" accessibilityLabel={tr('İş ağı hesabım')}>
            <Icon name="user" size={20} color={color.tealText} />
          </Pressable>
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
        contentContainerStyle={{ paddingBottom: fabBottom + 76 }}
        ListEmptyComponent={loading ? undefined : <Text style={s.empty}>{empty}</Text>}
        ListFooterComponent={loading ? <CardSkeleton count={(tab === 'firma' ? providers : posts).length ? 1 : 3} /> : more ? <View style={{ padding: 12 }}><Btn ghost title="Daha fazla yükle" onPress={() => void load(page + 1)} /></View> : undefined}
        renderItem={({ item }) => 'user_id' in item ? <FirmCard p={item} /> : <PostCard p={item} />}
      />
      {/* Yeni ilan: sağ altta sabit düğme (onaylı taslak) */}
      <Pressable style={({ pressed }) => [s.fab, { bottom: fabBottom }, pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 }]} onPress={create} accessibilityRole="button">
        <Icon name="plus" size={20} color={color.tealBright} />
        <Text style={s.fabT}>{tab === 'firma' ? 'Firma profilim' : section.cta[0] === 'İlan ver' ? 'İş ağı ilanı ver' : section.cta[0]}</Text>
      </Pressable>
      <Modal visible={acct} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAcct(false)}>
        <View style={{ flex: 1, backgroundColor: color.navy }}>
          <View style={s.sheetBar}>
            <Pressable onPress={() => setAcct(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Geri" style={s.sheetBack}><Icon name="chevron-left" size={28} color={color.onBar} /></Pressable>
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
  sheetTitle: { color: color.onBar, fontFamily: font.bold, fontSize: 18 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  switch: { padding: 16, paddingBottom: 12 },
  seg: { paddingVertical: 12, paddingHorizontal: 10, gap: 2, alignItems: 'flex-start', overflow: 'hidden', backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  segOn: { backgroundColor: color.teal, borderColor: color.teal },
  segTitle: { fontSize: 15.5, fontFamily: font.bold, color: color.ink, marginTop: 2, lineHeight: 19 },
  segSub: { fontSize: 13.5, color: color.muted },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius + 2, paddingLeft: 14, minHeight: 50 },
  input: { flex: 1, paddingVertical: 11, fontSize: 16, color: color.ink },
  cityBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 120, minHeight: 44, paddingHorizontal: 10, borderLeftWidth: 1, borderLeftColor: color.line },
  cityText: { color: color.muted, fontSize: 14, flexShrink: 1 },
  acctBtn: { width: 50, height: 50, borderRadius: radius + 2, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 16, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26, backgroundColor: color.navyDeep, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabT: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 16 },
  err: { color: color.bad },
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius + 4, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  roleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: color.ink },
  desc: { color: color.muted, fontSize: 14 },
  fresh: { backgroundColor: color.teal, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  freshText: { color: color.tealInk, fontSize: 11, fontWeight: '700' },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  cellL: { borderLeftWidth: 1, borderLeftColor: color.line },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
});

/** Sağa/sola kaydırarak komşu sekmeye geçilir (bkz. components/SwipeTabs.tsx). */
export default function NetworkTab() {
  return <SwipeTabs route="is-agi"><NetworkTabScreen /></SwipeTabs>;
}
