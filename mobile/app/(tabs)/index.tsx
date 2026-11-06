import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { SearchBox } from '../../components/SearchBox';
import { ListingCard } from '../../components/ListingCard';
import { Btn, Band, Label } from '../../components/ui';
import { AlertBox, CardSkeleton } from '../../components/kit';
import { FirmCard, PostCard } from '../../components/NetCards';
import { Icon, type IconName } from '../../components/Icon';
import { color, font, radius, shadow } from '../../lib/theme';
import { useLang } from '../../lib/lang';
import { tr } from '../../lib/i18n';
import { displayName, firstName } from '../../lib/person';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { money, type MarketPost, type Provider } from '../../lib/network';
import { photoUrl, supabase, tl, type Row } from '../../lib/supabase';

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
  const fg = color.tealText;
  const bg = color.tealSoft;
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

function Spot({ item }: { item: Row }) {
  const ph = [...(item.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  if (!ph) return null;
  return (
    <Pressable style={({ pressed }) => [s.spot, pressed && { opacity: 0.92 }]} onPress={() => router.push(`/ilan/${item.id}`)} accessibilityRole="button">
      <View>
        <Image source={{ uri: photoUrl(ph.path) }} style={s.spotPhoto} />
        <View style={s.spotTag}><Label style={s.spotTagText}>Öne çıkan ilan</Label></View>
      </View>
      <View style={s.spotBar}>
        <Text style={s.spotTitle} numberOfLines={2}>{item.title}</Text>
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
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      uid ? supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'pending') : Promise.resolve(null),
      uid ? supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'open') : Promise.resolve(null),
      uid ? supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle() : Promise.resolve(null),
      supabase.from('listings').select('category,listing_photos(path,position)').eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(150),
    ]);
    // Kategori kutuları: her grubun en yeni ilanının gerçek fotoğrafı.
    const crow = (cp.data ?? []) as unknown as { category: string; listing_photos: { path: string; position: number }[] | null }[];
    setPool(crow.filter((x) => x.listing_photos?.length).map((x) => ({ category: x.category, url: photoUrl([...(x.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0].path) })));
    setCats(CATEGORY_GROUPS.map((g) => {
      const mine = crow.filter((x) => (g.categories as readonly string[]).includes(x.category));
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
    <ScrollView ref={scroller} style={s.screen} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        {session ? <PlainText style={s.h1}>{`${tr('Merhaba,')} ${name}.`}</PlainText> : null}
        <Text style={s.lead}>Makine, yedek parça ve işini yapacak hizmeti burada bul.</Text>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}><SearchBox value={q} onChangeText={setQ} onSubmit={search} placeholder="Marka, model veya parça numarası ara" /></View>
          <Pressable style={s.go} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
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
          {([
            ['Gelen teklifler', counts?.offers, '/ag/hesabim', 'inbox'],
            ['Açık işlerim', counts?.works, '/ag/hesabim', 'clipboard'],
            ['İlanlarım', undefined, '/ilanlarim', 'list'],
            ['Makine parkım', undefined, '/ag/envanter', 'package'],
          ] as [string, number | undefined, string, IconName][]).map(([l, n, to, ic]) => (
            <Pressable key={l} style={({ pressed }) => [s.hubCell, pressed && { opacity: 0.88 }]} onPress={() => router.push(to as never)} accessibilityRole="button">
              <View style={s.hubIcon}><Icon name={ic} size={20} color={color.tealText} /></View>
              <View style={{ flex: 1 }}>
                {n !== undefined ? <PlainText style={s.hubNum}>{String(n)}</PlainText> : null}
                <Text style={s.hubLabel} numberOfLines={2}>{l}</Text>
              </View>
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

      {error ? <View style={{ marginHorizontal: 16, marginTop: 12 }}><AlertBox variant="destructive">Bazı bölümler yüklenemedi. Lütfen sayfayı yenileyin.</AlertBox></View> : null}
      {local.length ? <Band title={`${city} ilanları`} action="Tümünü gör" onAction={() => router.navigate({ pathname: '/ilanlar', params: { city } })} /> : null}
      {local.map((r) => <ListingCard key={'c' + r.id} item={r} />)}
      {spot ? <Spot item={spot} /> : null}
      {featured.length ? <Band title="Öne çıkanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} /> : null}
      {featured.filter((r) => r.id !== spot?.id).map((r) => <ListingCard key={'f' + r.id} item={r} />)}
      <Band title="Yeni ilanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} />
      {busy && !latest.length ? <CardSkeleton count={3} /> : null}
      {latest.map((r) => <ListingCard key={r.id} item={r} />)}
      {more && latest.length ? <View style={{ marginHorizontal: 16 }}><Btn ghost disabled={moreBusy} title={moreBusy ? 'Yükleniyor…' : 'Daha fazla ilan göster'} onPress={() => void loadMore()} /></View> : null}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      <Band title="Yeni iş fırsatları" action="Tümünü gör" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })} />
      {jobs.map((p) => <PostCard key={p.id} p={p} />)}
      {!busy && !jobs.length ? <Text style={s.empty}>Bir sonraki işin burada olabilir.</Text> : null}

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
  hero: { backgroundColor: color.navy, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 10, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  h1: { color: color.onBar, fontFamily: font.bold, fontSize: 30, lineHeight: 36 },
  lead: { color: color.onNavy, fontSize: 16, lineHeight: 22 },
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
  guestBtn: { backgroundColor: color.teal, paddingHorizontal: 16, minHeight: 42, justifyContent: 'center', borderRadius: 21 },
  guestBtnT: { color: color.tealInk, fontFamily: font.semi },
  hub: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginHorizontal: 16, marginTop: 16 },
  hubCell: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  hubIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  hubNum: { fontFamily: font.bold, fontSize: 20, lineHeight: 22, color: color.tealText },
  hubLabel: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 18, color: color.ink },
  spot: { marginHorizontal: 16, marginTop: 4, marginBottom: 16, backgroundColor: color.surface, borderRadius: radius + 8, overflow: 'hidden', ...shadow },
  spotPhoto: { width: '100%', height: 220, backgroundColor: color.plate },
  spotTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  spotTagText: { color: '#fff', fontSize: 12.5 },
  spotBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  spotTitle: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 17, lineHeight: 22 },
  spotPrice: { backgroundColor: color.pop, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  spotPriceText: { color: color.popInk, fontFamily: font.bold, fontSize: 18 },
  catCard: { width: 156, backgroundColor: color.surface, borderRadius: radius + 4, overflow: 'hidden', ...shadow },
  catPhoto: { width: 156, height: 112, backgroundColor: color.plate },
  catPlate: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 56 },
  catLabel: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 14.5, lineHeight: 18 },
  catN: { color: color.tealText, fontFamily: font.semi, fontSize: 14 },
  steps: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, paddingHorizontal: 14, ...shadow },
  step: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14 },
  stepNo: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: font.bold, fontSize: 16, color: color.tealText },
  cardTitle: { fontFamily: font.semi, color: color.ink, fontSize: 16 },
  meta: { color: color.muted, fontSize: 14.5, lineHeight: 20 },
  trust: { marginHorizontal: 16, marginTop: 16, padding: 16, gap: 10, backgroundColor: color.tealSoft, borderRadius: radius + 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustText: { color: color.ink, fontSize: 15 },
  link2: { color: color.tealText, fontFamily: font.semi, marginTop: 2 },
  cta: { marginHorizontal: 16, marginTop: 24, padding: 20, gap: 8, backgroundColor: color.navy, borderRadius: radius + 8 },
  ctaTitle: { color: color.onBar, fontFamily: font.bold, fontSize: 22, lineHeight: 28 },
  ctaText: { color: color.onNavy, fontSize: 15.5, lineHeight: 22 },
  ctaBtn: { marginTop: 8, backgroundColor: color.pop, borderRadius: radius, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { color: color.popInk, fontFamily: font.bold, fontSize: 16 },
  empty: { color: color.muted, marginHorizontal: 16 },
});
