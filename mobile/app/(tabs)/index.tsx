import { useCallback, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { SearchBox } from '../../components/SearchBox';
import { ListingCard } from '../../components/ListingCard';
import { Btn } from '../../components/ui';
import { AlertBox, CardSkeleton } from '../../components/kit';
import { FirmCard, PostCard } from '../../components/NetCards';
import { Icon, type IconName } from '../../components/Icon';
import { color, font, radius } from '../../lib/theme';
import { useLang } from '../../lib/lang';
import { tr } from '../../lib/i18n';
import { displayName, firstName } from '../../lib/person';
import { useApp } from '../../lib/AppContext';
import { type MarketPost, type Provider } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';

/** Kategori şeridi: sade, tek renkli çizimler (her temada aynı). */
const CATS: { label: string; cat: string; img: ImageSourcePropType }[] = [
  { label: 'Ekskavatör', cat: 'group:excavators', img: require('../../assets/cat/excavator.png') },
  { label: 'Beko loder', cat: 'group:loaders', img: require('../../assets/cat/loader.png') },
  { label: 'Kamyon', cat: 'group:trucks', img: require('../../assets/cat/truck.png') },
  { label: 'Vinç', cat: 'group:cranes', img: require('../../assets/cat/crane.png') },
  { label: 'Parça, lastik', cat: 'group:parts', img: require('../../assets/cat/parts.png') },
];
const net = (kind: string) => () => router.navigate({ pathname: '/is-agi', params: { kind } });

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [s.secBtn, pressed && { opacity: 0.7 }]}>
          <Text style={s.secAction}>{action}</Text>
          <Icon name="chevron-right" size={15} color={color.tealText} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Home() {
  const scroller = useRef<never>(null);
  useLang();
  useTabScrollTop('index', scroller);
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [latest, setLatest] = useState<Row[]>([]);
  const [featured, setFeatured] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [counts, setCounts] = useState<{ offers: number; works: number; mine: number } | null>(null);
  const [live, setLive] = useState(0);
  const [pname, setPname] = useState('');
  const [city, setCity] = useState('');
  const [local, setLocal] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<MarketPost[]>([]);
  const [firms, setFirms] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const base = { q: '', categories: [], city: 'Tümü', maxPrice: 6000000 };
  const load = useCallback(async () => {
    setBusy(true);
    const uid = session?.user.id;
    const [l, r, j, f, o, w, pr, mn, au] = await Promise.all([
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'new' }, count_only: false }),
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'rec' }, count_only: false }),
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('premium_rank', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      uid ? supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'pending') : Promise.resolve(null),
      uid ? supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'open') : Promise.resolve(null),
      uid ? supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle() : Promise.resolve(null),
      uid ? supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'active') : Promise.resolve(null),
      supabase.rpc('active_auctions', { p_limit: 60 }),
    ]);
    setError(!!(l.error || j.error || f.error));
    const rows = ((l.data as { rows?: Row[] } | null)?.rows ?? []);
    setLatest(rows);
    setPage(1);
    setMore(rows.length >= 10);
    setFeatured(((r.data as { rows?: Row[] } | null)?.rows ?? []).slice(0, 8));
    setJobs((j.data ?? []) as MarketPost[]);
    setFirms((f.data ?? []) as Provider[]);
    setLive(Array.isArray(au.data) ? au.data.length : 0);
    setCounts(uid && o && w ? { offers: o.count ?? 0, works: w.count ?? 0, mine: mn?.count ?? 0 } : null);
    const prof = (pr?.data as { full_name?: string; city?: string | null } | null) ?? null;
    setPname(prof?.full_name ?? '');
    const c = prof?.city ?? '';
    setCity(c);
    if (c) {
      const near = await supabase.rpc('search_listings', { p: { ...base, city: c, page: 1, sort: 'new' }, count_only: false });
      setLocal(((near.data as { rows?: Row[] } | null)?.rows ?? []).slice(0, 8));
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
  const name = firstName(displayName(session, pname));
  // İki sütun için satırlara böl
  const pairs: Row[][] = [];
  for (let i = 0; i < latest.length; i += 2) pairs.push(latest.slice(i, i + 2));

  return (
    <ScrollView ref={scroller} style={s.screen} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      {/* Selam + arama */}
      <View style={s.hero}>
        <PlainText style={s.hello}>{session && name ? `${tr('Merhaba,')} ${name}. ${tr('Bugün ne arıyorsun?')}` : tr('Makine, parça ve iş: hepsi burada.')}</PlainText>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}><SearchBox value={q} onChangeText={setQ} onSubmit={search} placeholder="Marka, model veya parça no" /></View>
          <Pressable style={({ pressed }) => [s.go, pressed && { opacity: 0.85 }]} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
      </View>

      {/* Kategoriler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cats}>
        {CATS.map((c) => (
          <Pressable key={c.cat} style={({ pressed }) => [s.cat, pressed && { opacity: 0.85 }]} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: c.cat } })} accessibilityRole="button">
            <View style={s.catTile}><Image source={c.img} style={s.catImg} resizeMode="contain" /></View>
            <Text style={s.catLabel} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        ))}
        <Pressable style={({ pressed }) => [s.cat, pressed && { opacity: 0.85 }]} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: '' } })} accessibilityRole="button">
          <View style={s.catTile}><Icon name="grid" size={26} color={color.tealText} /></View>
          <Text style={s.catLabel} numberOfLines={1}>Tümü</Text>
        </Pressable>
      </ScrollView>

      {/* Hizmetler: eş boyutlu, iki sütunlu düzenli ızgara */}
      <SectionHead title="Hizmetler" action="İş Ağı" onAction={() => router.navigate('/is-agi')} />
      <View style={s.svc}>
        {([
          ['Kiralık makine', 'Günlük, aylık · operatörlü', 'calendar', net('rental_machine'), ''],
          ['Operatör ve usta', 'Şoför, operatör, servis', 'user-check', net('rental_operator'), ''],
          ['Çekici bul', 'En yakın, puanlı', 'truck', () => router.push('/cekici' as never), '7/24'],
          ['Açık artırma', 'Teklif ver, kazan', 'award', () => router.push('/acik-artirmalar' as never), live ? `${live} ${tr('canlı')}` : ''],
          ['İş talepleri', 'Teklif ver, işi al', 'clipboard', net('job'), ''],
          ['Parça talebi', 'Aradığın parçayı yaz', 'search', net('part_request'), ''],
        ] as [string, string, IconName, () => void, string][]).map(([t, sub, ic, go, tag]) => (
          <Pressable key={t} style={({ pressed }) => [s.svcCard, pressed && { opacity: 0.88 }]} onPress={go} accessibilityRole="button">
            <View style={s.svcIcon}><Icon name={ic} size={20} color={color.tealText} /></View>
            <View style={{ flex: 1, gap: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.svcT} numberOfLines={1}>{t}</Text>
                {tag ? <View style={s.tag}><PlainText style={s.tagT}>{tag}</PlainText></View> : null}
              </View>
              <Text style={s.svcS} numberOfLines={1}>{sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Giriş yapmışsa: tek satır özet; misafirse giriş çağrısı */}
      {session ? (
        <View style={s.sum}>
          {([
            ['Gelen teklif', counts?.offers, '/ag/hesabim', true],
            ['Açık işim', counts?.works, '/ag/hesabim', false],
            ['Yayında ilanım', counts?.mine, '/ilanlarim', false],
          ] as [string, number | undefined, string, boolean][]).map(([l, n, to, accent], i) => (
            <Pressable key={l} style={({ pressed }) => [s.sumCell, i > 0 && s.sumSep, pressed && { opacity: 0.85 }]} onPress={() => router.push(to as never)} accessibilityRole="button">
              <PlainText style={[s.sumN, accent && { color: color.tealText }]}>{n == null ? '–' : String(n)}</PlainText>
              <Text style={s.sumL} numberOfLines={1}>{l}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={s.guest}>
          <View style={{ flex: 1 }}>
            <Text style={s.guestT}>Misafir olarak geziyorsun</Text>
            <Text style={s.guestS}>Giriş yaparak ilan ver, mesajlaş, favori ekle.</Text>
          </View>
          <Pressable style={s.guestBtn} onPress={() => router.navigate('/hesap')} accessibilityRole="button"><Text style={s.guestBtnT}>Giriş yap</Text></Pressable>
        </View>
      )}

      {error ? <View style={{ marginHorizontal: 16, marginTop: 12 }}><AlertBox variant="destructive">Bazı bölümler yüklenemedi. Lütfen sayfayı yenileyin.</AlertBox></View> : null}

      {featured.length ? (
        <>
          <SectionHead title="Öne çıkanlar" action="Tümü" onAction={() => router.navigate({ pathname: '/ilanlar', params: { cat: '' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
            {featured.map((r) => <ListingCard key={'f' + r.id} item={r} variant="wide" />)}
          </ScrollView>
        </>
      ) : null}

      {local.length ? (
        <>
          <SectionHead title={`${city} ${tr('ilanları')}`} action="Tümü" onAction={() => router.navigate({ pathname: '/ilanlar', params: { city } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
            {local.map((r) => <ListingCard key={'c' + r.id} item={r} variant="wide" />)}
          </ScrollView>
        </>
      ) : null}

      <SectionHead title="Yeni ilanlar" action="Tümü" onAction={() => router.navigate({ pathname: '/ilanlar', params: { cat: '' } })} />
      {busy && !latest.length ? <CardSkeleton count={2} /> : null}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {pairs.map((p) => (
          <View key={p[0].id} style={{ flexDirection: 'row', gap: 10 }}>
            <ListingCard item={p[0]} variant="grid" />
            {p[1] ? <ListingCard item={p[1]} variant="grid" /> : <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
      {more && latest.length ? <View style={{ marginHorizontal: 16, marginTop: 12 }}><Btn ghost disabled={moreBusy} title={moreBusy ? 'Yükleniyor…' : 'Daha fazla ilan göster'} onPress={() => void loadMore()} /></View> : null}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      {jobs.length ? (
        <>
          <SectionHead title="Yeni iş fırsatları" action="Tümü" onAction={net('job')} />
          {jobs.map((p) => <PostCard key={p.id} p={p} />)}
        </>
      ) : null}
      {firms.length ? (
        <>
          <SectionHead title="Bölgendeki şirketler" action="Tümü" onAction={net('firma')} />
          {firms.map((f) => <FirmCard key={f.user_id} p={f} />)}
        </>
      ) : null}

      {/* Şirket çağrısı: tek, sade şerit */}
      <Pressable style={({ pressed }) => [s.cta, pressed && { opacity: 0.92 }]} onPress={() => router.push(session ? '/ag/firma-kaydi' : '/hesap' as never)} accessibilityRole="button">
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.ctaT}>Şirketini sahaya çıkar</Text>
          <Text style={s.ctaS}>Makinelerin ve hizmet bölgen tek vitrinde</Text>
        </View>
        <Icon name="arrow-right" size={22} color={color.tealBright} />
      </Pressable>
      <Pressable onPress={() => router.push('/guven')} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}>
        <Text style={s.link2}>Güvenli alım rehberi</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  hero: { backgroundColor: color.navy, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: color.line },
  hello: { color: color.onNavy, fontSize: 15, lineHeight: 20 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  go: { backgroundColor: color.pop, borderRadius: radius + 2, paddingHorizontal: 18, height: 50, justifyContent: 'center' },
  goText: { color: color.popInk, fontFamily: font.bold, fontSize: 17 },
  cats: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  cat: { width: 70, alignItems: 'center', gap: 5 },
  catTile: { width: 68, height: 58, borderRadius: 18, backgroundColor: color.tile, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  catImg: { width: 54, height: 41 },
  catLabel: { fontFamily: font.semi, fontSize: 12, color: color.ink },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  secTitle: { fontFamily: font.bold, fontSize: 19, color: color.ink, flexShrink: 1 },
  secBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, paddingLeft: 12, paddingRight: 8, borderRadius: 16, backgroundColor: color.tealSoft },
  secAction: { fontFamily: font.semi, fontSize: 13.5, color: color.tealText },
  svc: { marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  svcCard: { width: '48.8%', minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius + 4, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  svcIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  svcT: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 17, color: color.ink, flexShrink: 1 },
  svcS: { fontSize: 12, color: color.muted },
  tag: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: color.plate },
  tagT: { fontFamily: font.textBold, fontSize: 9.5, color: color.ink },
  sum: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  sumCell: { flex: 1, paddingVertical: 9, paddingHorizontal: 14, gap: 2 },
  sumSep: { borderLeftWidth: 1, borderLeftColor: color.line },
  sumN: { fontFamily: font.bold, fontSize: 22, lineHeight: 25, color: color.ink },
  sumL: { fontSize: 12.5, color: color.muted },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  guestT: { fontFamily: font.semi, color: color.ink, fontSize: 15 },
  guestS: { color: color.muted, fontSize: 14, marginTop: 2 },
  guestBtn: { backgroundColor: color.teal, paddingHorizontal: 16, minHeight: 42, justifyContent: 'center', borderRadius: 21 },
  guestBtnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 15 },
  rail: { paddingHorizontal: 16, gap: 10 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: color.navyDeep, borderRadius: radius + 4 },
  ctaT: { fontFamily: font.bold, fontSize: 19, color: color.accentInk },
  ctaS: { fontSize: 13.5, color: color.onDeepMuted },
  link2: { color: color.tealText, fontFamily: font.semi, fontSize: 14 },
  empty: { color: color.muted, marginHorizontal: 16 },
});
