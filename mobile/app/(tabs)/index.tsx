import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { SearchBox } from '../../components/SearchBox';
import { ListingCard } from '../../components/ListingCard';
import { Btn, Band, Label } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { color, font } from '../../lib/theme';
import { displayName, firstName } from '../../lib/person';
import { useApp } from '../../lib/AppContext';
import { CATEGORY_GROUPS } from '../../lib/machineryCatalog';
import { money, type MarketPost, type Provider } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';

const QUICK: [string, IconName, () => void][] = [
  ['Satılık ilanlar', 'truck', () => router.navigate('/ilanlar')],
  ['Kiralık makineler', 'key', () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_machine' } })],
  ['Operatör ve ustalar', 'user-check', () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_operator' } })],
  ['İş talepleri', 'clipboard', () => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })],
  ['Parça talepleri', 'tool', () => router.navigate({ pathname: '/is-agi', params: { kind: 'part_request' } })],
  ['Yedek parça', 'settings', () => router.push('/yedek-parca')],
  ['Şirketler ve filolar', 'briefcase', () => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })],
  ['İl haritası', 'map', () => router.push('/harita')],
];
const STEPS: [string, string][] = [
  ['İhtiyacını paylaş', 'Konumu, tarihleri ve neye ihtiyacın olduğunu belirt.'],
  ['Teklifleri karşılaştır', 'Fiyatı, kapsamı ve şirket profilini birlikte değerlendir.'],
  ['Ayrıntıları konuş', 'Özel mesajlarla işi netleştir. Seçim ödeme oluşturmaz.'],
];

export default function Home() {
  const scroller = useRef<never>(null);
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
  const [local, setLocal] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<MarketPost[]>([]);
  const [firms, setFirms] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const base = { q: '', categories: [], city: 'Tümü', maxPrice: 6000000 };
  const load = useCallback(async () => {
    setBusy(true);
    const uid = session?.user.id;
    const [l, r, j, f, o, w, pr] = await Promise.all([
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'new' }, count_only: false }),
      supabase.rpc('search_listings', { p: { ...base, page: 1, sort: 'rec' }, count_only: false }),
      supabase.from('market_posts').select('*').eq('kind', 'job').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      supabase.from('service_providers').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
      uid ? supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'pending') : Promise.resolve(null),
      uid ? supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'open') : Promise.resolve(null),
      uid ? supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle() : Promise.resolve(null),
    ]);
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
  const name = firstName(displayName(session, pname));
  return (
    <ScrollView ref={scroller} style={s.screen} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} />} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <Text style={s.h1}>{session ? `Merhaba, ${name}.` : 'Al, sat, kirala. İşini paylaş, fiyat al.'}</Text>
        <Text style={s.lead}>Makine, yedek parça ve işini yapacak hizmeti burada bul.</Text>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}><SearchBox value={q} onChangeText={setQ} onSubmit={search} placeholder="Marka, model veya parça numarası ara" /></View>
          <Pressable style={s.go} onPress={search} accessibilityRole="button"><Text style={s.goText}>Ara</Text></Pressable>
        </View>
        {!session ? <Pressable onPress={() => router.navigate('/hesap')} accessibilityRole="button"><Text style={s.link}>Giriş yap / Kayıt ol →</Text></Pressable> : null}
      </View>

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
        {QUICK.map(([label, icon, go]) => (
          <Pressable key={label} style={s.tile} onPress={go} accessibilityRole="button">
            <Icon name={icon} size={22} color={color.accent} />
            <Text style={s.tileText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Band title="Satılık kategorilerine göz at" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {CATEGORY_GROUPS.map((g) => (
          <Pressable key={g.id} style={s.cat} onPress={() => router.navigate({ pathname: '/ilanlar', params: { cat: 'group:' + g.id } })} accessibilityRole="button"><Text style={s.catText}>{g.label}</Text></Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={s.err}>Bazı bölümler yüklenemedi. Aşağı çekerek yenileyebilirsin.</Text> : null}
      {local.length ? <Band title={`${city} ilanları`} action="Tümünü gör" onAction={() => router.navigate({ pathname: '/ilanlar', params: { city } })} /> : null}
      {local.map((r) => <ListingCard key={'c' + r.id} item={r} />)}
      {featured.length ? <Band title="Öne çıkanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} /> : null}
      {featured.map((r) => <ListingCard key={'f' + r.id} item={r} />)}
      <Band title="Yeni ilanlar" action="Tümünü gör" onAction={() => router.navigate('/ilanlar')} />
      {latest.map((r) => <ListingCard key={r.id} item={r} />)}
      {more && latest.length ? <View style={{ marginHorizontal: 12 }}><Btn ghost disabled={moreBusy} title={moreBusy ? 'Yükleniyor…' : 'Daha fazla ilan göster'} onPress={() => void loadMore()} /></View> : null}
      {!busy && !latest.length ? <Text style={s.empty}>Henüz ilan yok.</Text> : null}

      <Band title="Yeni iş fırsatları" action="Tümünü gör" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } })} />
      {jobs.map((p) => (
        <Pressable key={p.id} style={s.card} onPress={() => router.push(`/ag/ilan/${p.id}`)} accessibilityRole="button">
          <Text style={s.cardTitle}>{p.title}</Text>
          <Text style={s.meta}>{[p.category, p.city].filter(Boolean).join(' · ')}</Text>
          <Text style={s.price}>{money(p.price, p.price_unit)}</Text>
        </Pressable>
      ))}
      {!busy && !jobs.length ? <Text style={s.empty}>Bir sonraki işin burada olabilir.</Text> : null}

      <Band title="Bölgendeki şirketler" action="Şirketleri keşfet" onAction={() => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } })} />
      {firms.map((f) => (
        <Pressable key={f.user_id} style={s.card} onPress={() => router.push(`/firma/${f.user_id}`)} accessibilityRole="button">
          <Text style={s.cardTitle}>{f.name}</Text>
          <Text style={s.meta}>{f.city}</Text>
          <Text numberOfLines={2}>{f.description}</Text>
        </Pressable>
      ))}

      <Band title="Nasıl çalışır? Üç adım." />
      {STEPS.map(([t, d], i) => (
        <View key={t} style={s.card}><Text style={s.cardTitle}>{i + 1}. {t}</Text><Text>{d}</Text></View>
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
  screen: { flex: 1, backgroundColor: '#F6F5F3' },
  hub: { flexDirection: 'row', marginHorizontal: 12, marginTop: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  hubCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 2 },
  hubNum: { fontFamily: font.bold, fontSize: 22, color: color.accent },
  trust: { marginHorizontal: 12, marginTop: 18, padding: 12, gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderLeftWidth: 3, borderLeftColor: color.good },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { color: color.ink },
  link2: { color: color.accent, fontWeight: '600' },
  hero: { backgroundColor: color.navy, padding: 16, paddingTop: 12, gap: 8, borderBottomWidth: 3, borderBottomColor: color.accent },
  h1: { color: '#fff', fontSize: 27, fontWeight: '700', lineHeight: 31 },
  lead: { color: color.onNavy },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'flex-start' },
  go: { backgroundColor: color.accent, borderRadius: 4, paddingHorizontal: 18, height: 46, justifyContent: 'center' },
  goText: { color: '#fff', fontWeight: '700' },
  link: { color: '#fff', fontWeight: '600', textDecorationLine: 'underline' },
  h2b: { fontSize: 18, fontWeight: '700', color: color.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, borderLeftWidth: 1, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.surface },
  tile: { width: '50%', padding: 14, gap: 8, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.line },
  tileText: { fontWeight: '600', color: color.ink, fontSize: 16 },
  cat: { backgroundColor: color.surface, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: color.line },
  catText: { color: color.ink, fontWeight: '500' },
  card: { backgroundColor: color.surface, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 4, gap: 4, borderWidth: 1, borderColor: color.line },
  cardTitle: { fontWeight: '700', color: color.ink, fontSize: 16 },
  meta: { color: color.muted },
  price: { fontWeight: '700', color: color.accent },
  empty: { color: color.muted, marginHorizontal: 12 },
  err: { color: color.bad, marginHorizontal: 12, marginTop: 8 },
});
