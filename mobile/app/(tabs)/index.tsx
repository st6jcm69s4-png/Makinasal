import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { SearchBox } from '../../components/SearchBox';
import { ListingCard } from '../../components/ListingCard';
import { Btn, Band, Hatch, Label } from '../../components/ui';
import { AlertBox, CardSkeleton } from '../../components/kit';
import { FirmCard, PostCard } from '../../components/NetCards';
import { Icon, type IconName } from '../../components/Icon';
import { caps, color, font, radius } from '../../lib/theme';
import { useLang } from '../../lib/lang';
import { tr } from '../../lib/i18n';
import { displayName, firstName } from '../../lib/person';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { money, type MarketPost, type Provider } from '../../lib/network';
import { photoUrl, supabase, tl, type Row } from '../../lib/supabase';

type Tile = { label: string; tag: string; sub: string; icon: IconName; go: () => void; tone: 'navy' | 'accent' | 'paper'; wide?: boolean };
const QUICK: Tile[] = [
  { label: 'Satılık ilanlar', tag: 'Satış', sub: 'Makine, kamyon ve parça', icon: 'truck', tone: 'navy', wide: true, go: () => router.navigate('/ilanlar') },
  { label: 'Kiralık makineler', tag: 'Kiralık', sub: 'Günlük, aylık', icon: 'key', tone: 'paper', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_machine' } }) },
  { label: 'Operatör ve ustalar', tag: 'Eleman', sub: 'Şoför, usta, operatör', icon: 'user-check', tone: 'paper', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_operator' } }) },
  { label: 'İş talepleri', tag: 'İş', sub: 'Teklif ver, işi al', icon: 'clipboard', tone: 'paper', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } }) },
  { label: 'Parça talepleri', tag: 'Talep', sub: 'Aradığın parçayı yaz', icon: 'search', tone: 'paper', go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'part_request' } }) },
  { label: 'Yedek parça', tag: 'Parça', sub: 'Numaraya göre ara', icon: 'settings', tone: 'navy', go: () => router.push('/yedek-parca') },
  { label: 'Çekici bul', tag: 'Yol yardım', sub: 'En yakın, puanlı', icon: 'life-buoy', tone: 'accent', go: () => router.push('/cekici' as never) },
  { label: 'Şirketler ve filolar', tag: 'Firma', sub: 'Hizmet bölgesine göre', icon: 'briefcase', tone: 'paper', wide: true, go: () => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } }) },
];
function TileCard({ t }: { t: Tile }) {
  const dark = t.tone !== 'paper';
  const bg = t.tone === 'navy' ? color.navy : t.tone === 'accent' ? color.accent : color.surface;
  const ink = dark ? '#fff' : color.ink;
  const soft = t.tone === 'accent' ? color.accentSoft : dark ? color.onNavy : color.muted;
  return (
    <Pressable style={({ pressed }) => [s.tile, t.wide ? { width: '100%' } : { width: '48.5%' }, { backgroundColor: bg, borderColor: dark ? bg : color.line }, pressed && { opacity: 0.88 }]} onPress={t.go} accessibilityRole="button">
      <View style={s.tileMark} pointerEvents="none"><Icon name={t.icon} size={t.wide ? 112 : 92} color={dark ? '#FFFFFF' : color.navy} /></View>
      <Label style={{ color: soft }}>{t.tag}</Label>
      <View style={{ flex: 1 }} />
      <Text style={[s.tileTitle, { color: ink }]} numberOfLines={2}>{t.label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[s.tileSub, { color: soft }]} numberOfLines={1}>{t.sub}</Text>
        <Icon name="arrow-right" size={14} color={dark ? '#fff' : color.accent} />
      </View>
    </Pressable>
  );
}
const STEPS: [string, string][] = [
  ['İhtiyacını paylaş', 'Konumu, tarihleri ve neye ihtiyacın olduğunu belirt.'],
  ['Teklifleri karşılaştır', 'Fiyatı, kapsamı ve şirket profilini birlikte değerlendir.'],
  ['Ayrıntıları konuş', 'Özel mesajlarla işi netleştir. Seçim ödeme oluşturmaz.'],
];

function Spot({ item }: { item: Row }) {
  const ph = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  if (!ph) return null;
  return (
    <Pressable style={({ pressed }) => [s.spot, pressed && { opacity: 0.9 }]} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
      <Image source={{ uri: photoUrl(ph.path) }} style={s.spotPhoto} />
      <View style={s.spotBar}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label style={{ color: color.onNavy }}>Öne çıkan ilan</Label>
          <Text style={s.spotTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={s.spotPrice}><PlainText style={s.spotPriceText}>{tl(item.price)}</PlainText></View>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const scroller = useRef<never>(null);
  const { lang } = useLang();
  useTabScrollTop('index', scroller);
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [latest, setLatest] = useState<Row[]>([]);
  const [featured, setFeatured] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [counts, setCounts] = useState<{ offers: number; works: number } | null>(null);
  const [pname, setPname] = useState('');
  const [city, setCity] = useState('');
  const [pool, setPool] = useState<{ category: string; url: string }[]>([]);
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
    const [l, r, j, f, o, w, pr, cp] = await Promise.all([
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'new' }, count_only: false }),
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'rec' }, count_only: false }),
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
      uid ? supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'pending') : Promise.resolve(null),
      uid ? supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'open') : Promise.resolve(null),
      uid ? supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle() : Promise.resolve(null),
      supabase.from('listings').select('category,listing_photos(path,position)').eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(150),
    ]);
    // Kategori kutuları: her grubun en yeni ilanının gerçek fotoğrafı.
    const crow = (cp.data ?? []) as unknown as { category: string; listing_photos: { path: string; position: number }[] | null }[];
    setPool(crow.filter((x) => x.listing_photos?.length).map((x) => ({ category: x.category, url: photoUrl([...(x.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0].path) })));
    setCats(CATEGORY_GROUPS.map((g) => {
      const mine = crow.filter((x) => g.categories.includes(x.category));
      const withPhoto = mine.find((x) => x.listing_photos?.length);
      const ph = withPhoto ? [...(withPhoto.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0] : null;
      return { id: g.id, label: g.label, photo: ph ? photoUrl(ph.path) : '', n: mine.length };
    }).filter((c) => c.photo));
    setError(!!(l.error || j.error || f.error));
    const rows = ((l.data as { rows?: Row[] } | null)?.rows ?? []);
    setLatest(rows);
    setPage(1);
    setMore(rows.length >= 10);
    setFeatured(((r.data as { rows?: Row[] } | null)?.rows ?? []).slice(0, 6));
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
  const spot = featured.find((r) => r.listing_photos?.length) ?? null;
  const name = firstName(displayName(session, pname));
  return (
    <ScrollView ref={scroller} style={s.screen} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <PlainText style={s.h1}>{caps(session ? `Merhaba, ${name}.` : tr('Al, sat, kirala. İşini paylaş, fiyat al.'), lang)}</PlainText>
        <Text style={s.lead}>Makine, yedek parça ve işini yapacak hizmeti burada bul.</Text>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}><SearchBox value={q} onChangeText={setQ} onSubmit={search} placeholder="Marka, model veya parça numarası ara" /></View>
          <Pressable style={s.go} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
      </View>

      <Hatch height={7} />
      {!session ? (
        <View style={s.guest}>
          <Icon name="eye" size={20} color={color.navy} />
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
      <Band title="Hızlı keşfet" />
      <View style={s.grid}>
        {QUICK.map((t) => <TileCard key={t.label} t={t} />)}
      </View>

      {cats.length ? (
        <>
          <Band title="Satılık kategorilerine göz at" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
            {cats.map((c) => (
              <Pressable key={c.id} style={({ pressed }) => [s.catCard, pressed && { opacity: 0.85 }]} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: 'group:' + c.id } })} accessibilityRole="button">
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

      {error ? <View style={{ marginHorizontal: 12, marginTop: 12 }}><AlertBox variant="destructive">Bazı bölümler yüklenemedi. Aşağı çekerek yenileyebilirsin.</AlertBox></View> : null}
      {local.length ? <Band title={`${city} ilanları`} action="Tümünü gör" onAction={() => router.navigate({ pathname: '/ilanlar', params: { city } })} /> : null}
      {local.map((r) => <ListingCard key={'c' + r.id} item={r} />)}
      {spot ? <Spot item={spot} /> : null}
      {featured.length ? <Band title="Öne çıkanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} /> : null}
      {featured.filter((r) => r.id !== spot?.id).map((r) => <ListingCard key={'f' + r.id} item={r} />)}
      <Band title="Yeni ilanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} />
      {busy && !latest.length ? <CardSkeleton count={3} /> : null}
      {latest.map((r) => <ListingCard key={r.id} item={r} />)}
      {more && latest.length ? <View style={{ marginHorizontal: 12 }}><Btn ghost disabled={moreBusy} title={moreBusy ? 'Yükleniyor…' : 'Daha fazla ilan göster'} onPress={() => void loadMore()} /></View> : null}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      <Band title="Yeni iş fırsatları" action="Tümünü gör" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })} />
      {jobs.map((p) => <PostCard key={p.id} p={p} />)}
      {!busy && !jobs.length ? <Text style={s.empty}>Bir sonraki işin burada olabilir.</Text> : null}

      <Band title="Bölgendeki şirketler" action="Şirketleri keşfet" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })} />
      {firms.map((f) => <FirmCard key={f.user_id} p={f} />)}

      <Band title="Nasıl çalışır? Üç adım." />
      {STEPS.map(([t, d], i) => (
        <View key={t} style={s.step}><PlainText style={s.stepNo}>{`0${i + 1}`}</PlainText><View style={{ flex: 1, gap: 2 }}><Text style={s.cardTitle}>{t}</Text><Text style={s.meta}>{d}</Text></View></View>
      ))}

      <View style={s.trust}>
        {['Konuma göre keşfet', 'İki tarafa özel teklifler', 'Tek hesapla iş ve ilan yönetimi'].map((t) => (
          <View key={t} style={s.trustRow}><Icon name="check" size={16} color={color.good} /><Text style={s.trustText}>{t}</Text></View>
        ))}
        <Pressable onPress={() => router.push('/guven')} accessibilityRole="button"><Text style={s.link2}>Güvenli işlem rehberi →</Text></Pressable>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={[s.h2b, { fontFamily: font.bold }]}>Şirketini sahaya çıkar</Text>
        <Text>Hafriyat şirketin, kamyonların ve makinelerin için tek bir şirket vitrini oluştur.</Text>
        <Btn title="Şirket profili oluştur →" onPress={() => router.push(session ? '/ag/firma-kaydi' : '/hesap' as never)} />
        <Btn ghost title="Güvenli işlem rehberi" onPress={() => router.push('/guven')} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 14, padding: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderLeftWidth: 3, borderLeftColor: color.navy },
  guestT: { fontWeight: '700', color: color.ink, fontSize: 15 },
  guestS: { color: color.muted, fontSize: 13.5 },
  guestBtn: { backgroundColor: color.accent, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: radius },
  guestBtnT: { color: '#fff', fontWeight: '700' },
  hub: { flexDirection: 'row', marginHorizontal: 12, marginTop: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  hubCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 2 },
  hubNum: { fontFamily: font.bold, fontSize: 22, color: color.accentText },
  trust: { marginHorizontal: 12, marginTop: 18, padding: 12, gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderLeftWidth: 3, borderLeftColor: color.good },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { color: color.ink },
  link2: { color: color.accentText, fontWeight: '600' },
  spot: { marginHorizontal: 12, marginTop: 14, borderWidth: 1, borderColor: color.navy, backgroundColor: color.navy },
  spotPhoto: { width: '100%', height: 200, backgroundColor: color.plate },
  spotBar: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 3, borderTopColor: color.accent },
  spotTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  spotPrice: { backgroundColor: color.accent, justifyContent: 'center', paddingHorizontal: 14 },
  spotPriceText: { color: '#fff', fontFamily: font.bold, fontSize: 19 },
  catCard: { width: 150, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  catPhoto: { width: 150, height: 104, backgroundColor: color.plate },
  catPlate: { backgroundColor: color.navy, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, minHeight: 50, borderTopWidth: 2, borderTopColor: color.accent },
  catLabel: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 17 },
  catN: { color: color.onNavy, fontFamily: font.label, fontSize: 15 },
  hero: { backgroundColor: color.navy, padding: 16, paddingTop: 12, gap: 8 },
  h1: { color: '#fff', fontFamily: font.labelBold, fontSize: 36, lineHeight: 38, letterSpacing: 0.5 },
  lead: { color: color.onNavy },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'flex-start' },
  go: { backgroundColor: color.accent, borderRadius: 4, paddingHorizontal: 18, height: 46, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '700' },
  link: { color: '#fff', fontWeight: '600', textDecorationLine: 'underline' },
  h2b: { fontSize: 18, fontWeight: '700', color: color.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginHorizontal: 12 },
  tile: { minHeight: 118, padding: 12, borderWidth: 1, overflow: 'hidden', borderRadius: radius },
  tileMark: { position: 'absolute', right: -14, bottom: -18, opacity: 0.11 },
  tileTitle: { fontFamily: font.bold, fontSize: 19, lineHeight: 21 },
  tileSub: { fontSize: 13.5, flexShrink: 1 },
  cat: { backgroundColor: color.surface, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: color.line },
  catText: { color: color.ink, fontWeight: '500' },
  card: { backgroundColor: color.surface, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 4, gap: 4, borderWidth: 1, borderColor: color.line },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.line },
  stepNo: { fontFamily: font.labelBold, fontSize: 34, lineHeight: 34, color: color.accentText, width: 48 },
  cardTitle: { fontWeight: '700', color: color.ink, fontSize: 16 },
  meta: { color: color.muted },
  price: { fontWeight: '700', color: color.accentText },
  empty: { color: color.muted, marginHorizontal: 12 },
  err: { color: color.bad, marginHorizontal: 12, marginTop: 8 },
});
