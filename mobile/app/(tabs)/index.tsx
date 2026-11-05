import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { SearchBox } from '../../components/SearchBox';
import { ListingCard } from '../../components/ListingCard';
import { Btn, Band, Label } from '../../components/ui';
import { AlertBox, CardSkeleton } from '../../components/kit';
import { FirmCard } from '../../components/NetCards';
import { Icon, type IconName } from '../../components/Icon';
import { color, font, radius, shadow } from '../../lib/theme';
import { useLang } from '../../lib/lang';
import { localeOf, tr } from '../../lib/i18n';
import { displayName, firstName } from '../../lib/person';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { money, POST_KINDS, RENTAL_MODES, type MarketPost, type Provider } from '../../lib/network';
import { photoUrl, supabase, type Row } from '../../lib/supabase';

type Short = { label: string; sub: string; icon: IconName; tint: 'accent' | 'teal'; go: () => void; wide?: boolean };
const SHORTS: Short[] = [
  { label: 'Satılık ilanlar', sub: 'Makine, kamyon ve parça', icon: 'truck', tint: 'accent', wide: true, go: () => router.navigate('/ilanlar') },
  { label: 'Kiralık makineler', sub: 'Günlük, aylık', icon: 'key', tint: 'teal', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_machine' } }) },
  { label: 'Yedek parça', sub: 'Numaraya göre ara', icon: 'settings', tint: 'accent', go: () => router.push('/yedek-parca') },
  { label: 'Operatör ve ustalar', sub: 'Şoför, usta, operatör', icon: 'user-check', tint: 'teal', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_operator' } }) },
  { label: 'İş talepleri', sub: 'Teklif ver, işi al', icon: 'clipboard', tint: 'accent', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } }) },
  { label: 'Parça talepleri', sub: 'Aradığın parçayı yaz', icon: 'search', tint: 'teal', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'part_request' } }) },
  { label: 'Çekici bul', sub: 'En yakın, puanlı', icon: 'life-buoy', tint: 'accent', go: () => router.push('/cekici' as never) },
  { label: 'Şirketler ve filolar', sub: 'Hizmet bölgesine göre', icon: 'briefcase', tint: 'teal', wide: true, go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } }) },
];
function ShortCard({ t }: { t: Short }) {
  const fg = t.tint === 'accent' ? color.accentText : color.teal;
  const bg = t.tint === 'accent' ? color.accentSoft : color.tealSoft;
  return (
    <Pressable style={({ pressed }) => [s.short, t.wide ? { width: '100%' } : { width: '48.5%' }, pressed && { opacity: 0.88 }]} onPress={t.go} accessibilityRole="button">
      <View style={[s.shortIcon, { backgroundColor: bg }]}><Icon name={t.icon} size={20} color={fg} /></View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.shortText} numberOfLines={2}>{t.label}</Text>
        <Text style={s.shortSub} numberOfLines={1}>{t.sub}</Text>
      </View>
    </Pressable>
  );
}
const STEPS: [string, string][] = [
  ['İhtiyacını paylaş', 'Konumu, tarihleri ve neye ihtiyacın olduğunu belirt.'],
  ['Teklifleri karşılaştır', 'Fiyatı, kapsamı ve şirket profilini birlikte değerlendir.'],
  ['Ayrıntıları konuş', 'Özel mesajlarla işi netleştir. Seçim ödeme oluşturmaz.'],
];

export default function Home() {
  const scroller = useRef<never>(null);
  const { lang } = useLang();
  useTabScrollTop('index', scroller);
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [latest, setLatest] = useState<Row[]>([]);
  const [rentals, setRentals] = useState<MarketPost[]>([]);
  const [parts, setParts] = useState<MarketPost[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [counts, setCounts] = useState<{ offers: number; works: number } | null>(null);
  const [pname, setPname] = useState('');
  const [city, setCity] = useState('');
  const [cats, setCats] = useState<{ id: string; label: string; photo: string; n: number }[]>([]);
  const [local, setLocal] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<MarketPost[]>([]);
  const [firms, setFirms] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const base = { q: '', categories: [], city: 'Tümü', maxPrice: 6000000 };
  const load = useCallback(async () => {
    setBusy(true);
    const uid = session?.user.id;
    const [l, r, j, f, o, w, pr, cp, p] = await Promise.all([
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'new' }, count_only: false }),
      supabase.from('market_posts').select('*').eq('kind', 'rental_machine').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
      uid ? supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'pending') : Promise.resolve(null),
      uid ? supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'open') : Promise.resolve(null),
      uid ? supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle() : Promise.resolve(null),
      supabase.from('listings').select('category,listing_photos(path,position)').eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(150),
      supabase.from('market_posts').select('*').eq('kind', 'part_request').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    ]);
    // Kategori kutuları: her grubun en yeni ilanının gerçek fotoğrafı.
    const crow = (cp.data ?? []) as unknown as { category: string; listing_photos: { path: string; position: number }[] | null }[];
    setCats(CATEGORY_GROUPS.map((g) => {
      const mine = crow.filter((x) => g.categories.some((category) => category === x.category));
      const withPhoto = mine.find((x) => x.listing_photos?.length);
      const ph = withPhoto ? [...(withPhoto.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0] : null;
      return { id: g.id, label: g.label, photo: ph ? photoUrl(ph.path) : '', n: mine.length };
    }).filter((c) => c.photo));
    setError(!!(l.error || j.error || f.error || r.error || p.error));
    const rows = ((l.data as { rows?: Row[] } | null)?.rows ?? []);
    setLatest(rows);
    setPage(1);
    setMore(rows.length >= 10);
    setRentals((r.data ?? []) as MarketPost[]);
    setParts((p.data ?? []) as MarketPost[]);
    setJobs((j.data ?? []) as MarketPost[]);
    setFirms((f.data ?? []) as Provider[]);
    setCounts(uid && o && w ? { offers: o.count ?? 0, works: w.count ?? 0 } : null);
    const prof = (pr?.data as { full_name?: string; city?: string | null } | null) ?? null;
    setPname(prof?.full_name ?? '');
    const c = prof?.city ?? '';
    setCity(c);
    if (c) {
      const near = await supabase.rpc('search_listings', { p: { ...base, city: c, page: 1, sort: 'new' }, count_only: false });
      setLocal(((near.data as { rows?: Row[] } | null)?.rows ?? []).slice(0, 4));
    } else setLocal([]);
    setBusy(false);
  }, [session]);
  async function loadMore() {
    setMoreBusy(true);
    const { data, error: e } = await supabase.rpc('search_listings', { p: { ...base, page: page + 1, sort: 'new' }, count_only: false });
    const rows = ((data as { rows?: Row[] } | null)?.rows ?? []);
    if (!e) {
      setLatest((cur) => [...cur, ...rows.filter((x) => !cur.some((c) => c.id === x.id))]);
      setPage(page + 1);
      setMore(rows.length >= 10);
    }
    setMoreBusy(false);
  }
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const search = () => router.navigate({ pathname: '/ilanlar', params: { q: q.trim() } });
  const feed = [...jobs, ...rentals, ...parts].sort((a,b) => b.created_at.localeCompare(a.created_at));
  const day = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? tr('Tarih görüşülecek') : new Intl.DateTimeFormat(localeOf(lang), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  };
  const name = firstName(displayName(session, pname));
  return (
    <ScrollView ref={scroller} style={s.screen} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <Text style={s.kicker}>{city || 'Tüm Türkiye'}</Text>
        <Text accessibilityRole="header" style={s.h1}>Saha Defteri</Text>
        <Text style={s.lead}>Bugün sahada ne lazım?</Text>
        {session ? <PlainText style={s.lead}>{`${tr('Merhaba,')} ${name}.`}</PlainText> : null}
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}><SearchBox value={q} onChangeText={setQ} onSubmit={search} placeholder="Marka, model veya parça numarası ara" /></View>
          <Pressable style={s.go} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
      </View>

      <View style={s.primaryLinks}>
        {([['Makine bul', SHORTS[0].go],['İş bul',SHORTS[4].go],['Parça bul',SHORTS[2].go]] as const).map(([label,go],i) =>
          <Pressable key={label} style={s.primaryLink} onPress={go} accessibilityRole="button">
            <PlainText style={s.kicker}>0{i+1}</PlainText><Text style={s.link2}>{label}</Text>
          </Pressable>)}
      </View>
      <Band title="Saha Akışı" action="Tümünü gör" onAction={() => router.navigate('/is-agi')} />
      <View style={s.log}>
        <Text style={[s.logRow, s.kicker]}>Tüm Türkiye</Text>
        {feed.map(p => <Pressable key={p.id} style={({pressed}) => [s.logRow, pressed && {backgroundColor:color.accentSoft}]} accessibilityRole="button" onPress={() => router.push(`/ag/ilan/${p.id}`)}>
          <Text style={s.kicker}>{POST_KINDS[p.kind]}</Text>
          <PlainText style={s.cardTitle}>{p.title}</PlainText>
          {p.kind === 'rental_machine' && p.rental_mode && p.rental_mode in RENTAL_MODES ? <Text style={s.meta}>{RENTAL_MODES[p.rental_mode as keyof typeof RENTAL_MODES]}</Text> : null}
          {p.kind === 'part_request' && p.specs ? <PlainText style={s.meta}>{p.specs}</PlainText> : null}
          <View style={s.logMeta}>
            <PlainText style={s.logLocation}>{[p.city,p.district].filter(Boolean).join(' / ')} · {p.start_date ? day(p.start_date) : tr('Tarih görüşülecek')}{p.end_date ? ` – ${day(p.end_date)}` : ''}</PlainText>
            <Text style={s.logPrice}>{money(p.price,p.price_unit)}</Text>
          </View>
        </Pressable>)}
        {!feed.length ? <Text style={s.logRow}>{busy ? 'Yükleniyor…' : error ? 'Bazı bölümler yüklenemedi.' : 'Henüz açık talep veya kiralık ilan yok.'}</Text> : null}
      </View>
      <Band title="Hızlı keşfet" style={{ marginTop: 22 }} />
      <View style={s.grid}>
        {SHORTS.map((t) => <ShortCard key={t.label} t={t} />)}
      </View>

      {!session ? (
        <View style={s.guest}>
          <View style={{ flex: 1 }}>
            <Text style={s.guestT}>Misafir olarak geziyorsun</Text>
            <Text style={s.guestS}>Giriş yaparak ilan ver, mesajlaş, favori ekle.</Text>
          </View>
          <Pressable style={s.guestBtn} onPress={() => router.navigate('/hesap')} accessibilityRole="button"><Text style={s.guestBtnT}>Giriş yap</Text></Pressable>
        </View>
      ) : null}
      {session ? (
        <View style={s.hub}>
          {([['Gelen teklifler', counts?.offers, '/ag/hesabim'], ['Açık işlerim', counts?.works, '/ag/hesabim'], ['İlanlarım', undefined, '/ilanlarim'], ['Envanterim', undefined, '/ag/envanter']] as [string, number | undefined, string][]).map(([l, n, to], i) => (
            <Pressable key={l} style={[s.hubCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: color.line }]} onPress={() => router.push(to as never)} accessibilityRole="button">
              <PlainText style={s.hubNum}>{n === undefined ? '→' : String(n)}</PlainText>
              <Label>{l}</Label>
            </Pressable>
          ))}
        </View>
      ) : null}

      {cats.length ? (
        <>
          <Band title="Satılık kategorilerine göz at" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}>
            {cats.map((c) => (
              <Pressable key={c.id} style={({ pressed }) => [s.catCard, pressed && { opacity: 0.88 }]} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: 'group:' + c.id } })} accessibilityRole="button">
                <Image source={{ uri: c.photo }} style={s.catPhoto} />
                <View style={s.catPlate}>
                  <Text style={s.catLabel} numberOfLines={2}>{c.label}</Text>
                  <PlainText style={s.catN}>{String(c.n)}</PlainText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {error ? <View style={{ marginHorizontal: 16, marginTop: 12 }}><AlertBox variant="destructive">Bazı bölümler yüklenemedi. Aşağı çekerek yenileyebilirsin.</AlertBox></View> : null}
      {local.length ? <Band title={`${city} ilanları`} action="Tümünü gör" onAction={() => router.navigate({ pathname: '/ilanlar', params: { city } })} /> : null}
      {local.map((r) => <ListingCard key={'c' + r.id} item={r} />)}
      <Band title="Yeni ilanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} />
      {busy && !latest.length ? <CardSkeleton count={3} /> : null}
      {latest.map((r) => <ListingCard key={r.id} item={r} />)}
      {more && latest.length ? <View style={{ marginHorizontal: 16 }}><Btn ghost disabled={moreBusy} title={moreBusy ? 'Yükleniyor…' : 'Daha fazla ilan göster'} onPress={() => void loadMore()} /></View> : null}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      <Band title="Bölgendeki şirketler" action="Şirketleri keşfet" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })} />
      {firms.map((f) => <FirmCard key={f.user_id} p={f} />)}

      <Band title="Nasıl çalışır? Üç adım." />
      <View style={s.steps}>
        {STEPS.map(([t, d], i) => (
          <View key={t} style={[s.step, i > 0 && { borderTopWidth: 1, borderTopColor: color.line }]}>
            <View style={s.stepNo}><PlainText style={s.stepNoText}>{String(i + 1)}</PlainText></View>
            <View style={{ flex: 1, gap: 2 }}><Text style={s.cardTitle}>{t}</Text><Text style={s.meta}>{d}</Text></View>
          </View>
        ))}
      </View>

      <View style={s.trust}>
        {['Konuma göre keşfet', 'İki tarafa özel teklifler', 'Tek hesapla iş ve ilan yönetimi'].map((t) => (
          <View key={t} style={s.trustRow}><Icon name="check-circle" size={18} color={color.teal} /><Text style={s.trustText}>{t}</Text></View>
        ))}
        <Pressable onPress={() => router.push('/guven')} accessibilityRole="button"><Text style={s.link2}>Güvenli işlem rehberi →</Text></Pressable>
      </View>

      <View style={s.cta}>
        <Text style={s.ctaTitle}>Şirketini sahaya çıkar</Text>
        <Text style={s.ctaText}>Hafriyat şirketin, kamyonların ve makinelerin için tek bir şirket vitrini oluştur.</Text>
        <Pressable style={s.ctaBtn} onPress={() => router.push(session ? '/ag/firma-kaydi' : '/hesap' as never)} accessibilityRole="button"><Text style={s.ctaBtnText}>Şirket profili oluştur →</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  hero: { backgroundColor: color.surface, paddingHorizontal: 16, paddingVertical: 14, gap: 6, borderTopWidth: 4, borderTopColor: color.accent, borderBottomWidth: 1, borderBottomColor: color.line },
  h1: { color: color.ink, fontFamily: font.bold, fontSize: 30, lineHeight: 36 },
  lead: { color: color.muted, fontSize: 16, lineHeight: 22 },
  kicker: { color: color.accentText, fontFamily: font.semi, fontSize: 12 },
  primaryLinks: { flexDirection:'row', borderBottomWidth:1, borderColor:color.line, backgroundColor:color.surface },
  primaryLink: { flex:1, paddingHorizontal:10, paddingVertical:10, borderRightWidth:1, borderRightColor:color.line },
  log: { marginHorizontal:16, backgroundColor:color.surface, borderTopWidth:3, borderTopColor:color.accent, borderWidth:1, borderColor:color.line },
  logRow: { padding:12, gap:4, borderBottomWidth:1, borderBottomColor:color.line },
  logMeta: { flexDirection:'row', flexWrap:'wrap', gap:6, alignItems:'baseline', justifyContent:'space-between' },
  logLocation: { color:color.muted, fontSize:13, flexShrink:1 },
  logPrice: { color:color.ink, fontWeight:'700', fontSize:14 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'flex-start' },
  go: { backgroundColor: color.pop, borderRadius: radius + 2, paddingHorizontal: 20, height: 50, justifyContent: 'center' },
  goText: { color: color.popInk, fontFamily: font.bold, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginHorizontal: 16 },
  short: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius + 4, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  shortIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shortText: { color: color.ink, fontFamily: font.semi, fontSize: 15.5, lineHeight: 19 },
  shortSub: { color: color.muted, fontSize: 13 },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 14, backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  guestT: { fontFamily: font.semi, color: color.ink, fontSize: 15 },
  guestS: { color: color.muted, fontSize: 14, marginTop: 2 },
  guestBtn: { backgroundColor: color.accent, paddingHorizontal: 16, minHeight: 42, justifyContent: 'center', borderRadius: 21 },
  guestBtnT: { color: color.accentInk, fontFamily: font.semi },
  hub: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: color.surface, borderRadius: radius + 4, paddingVertical: 4, ...shadow },
  hubCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  hubNum: { fontFamily: font.bold, fontSize: 22, color: color.accentText },
  catCard: { width: 156, backgroundColor: color.surface, borderRadius: radius + 4, overflow: 'hidden', ...shadow },
  catPhoto: { width: 156, height: 112, backgroundColor: color.plate },
  catPlate: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 56 },
  catLabel: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 14.5, lineHeight: 18 },
  catN: { color: color.accentText, fontFamily: font.semi, fontSize: 14 },
  steps: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, paddingHorizontal: 14, ...shadow },
  step: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14 },
  stepNo: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: font.bold, fontSize: 16, color: color.accentText },
  cardTitle: { fontFamily: font.semi, color: color.ink, fontSize: 16 },
  meta: { color: color.muted, fontSize: 14.5, lineHeight: 20 },
  trust: { marginHorizontal: 16, marginTop: 16, padding: 16, gap: 10, backgroundColor: color.tealSoft, borderRadius: radius + 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustText: { color: color.ink, fontSize: 15 },
  link2: { color: color.accentText, fontFamily: font.semi, marginTop: 2 },
  cta: { marginHorizontal: 16, marginTop: 24, padding: 20, gap: 8, backgroundColor: color.navy, borderRadius: radius + 8 },
  ctaTitle: { color: color.onBar, fontFamily: font.bold, fontSize: 22, lineHeight: 28 },
  ctaText: { color: color.onNavy, fontSize: 15.5, lineHeight: 22 },
  ctaBtn: { marginTop: 8, backgroundColor: color.pop, borderRadius: radius, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { color: color.popInk, fontFamily: font.bold, fontSize: 16 },
  empty: { color: color.muted, marginHorizontal: 16 },
});
