import { useCallback, useEffect, useState } from 'react';
import { GuestGate } from './LoginPrompt';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from './LText';
import { Icon, type IconName } from './Icon';
import { Btn, Hatch, Label } from './ui';
import { AlertBox, Badge, RowSkeleton, StatusBadge } from './kit';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { dateLabel, money, POST_KINDS, QUOTE_STATUS, type MarketPost } from '../lib/network';
import { supabase } from '../lib/supabase';
import { color, font, radius } from '../lib/theme';

type Q = { id: string; post_id: string; owner_id: string; bidder_id: string; display_name: string; amount: number; price_unit: string; status: string; created_at: string; market_posts: { title: string; kind: string } | { title: string; kind: string }[] | null };
type Seg = 'posts' | 'incoming' | 'sent';
const ST: Record<string, string> = { open: 'Açık', closed: 'Kapalı', removed: 'Kaldırıldı' };
const tone = (s: string) => (s === 'accepted' || s === 'open' ? [color.goodBg, color.good] : s === 'declined' || s === 'removed' ? [color.badBg, color.bad] : s === 'pending' ? [color.warnBg, color.warn] : [color.plate, color.muted]);

/** İş ağı hesabı: ilanlarım, gelen teklif/başvurular, verdiklerim. Hem sayfada hem alttan açılan panelde kullanılır. */
export function NetAccountView({ onNavigate, embedded }: { onNavigate?: () => void; embedded?: boolean }) {
  const { session } = useApp();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [inc, setInc] = useState<Q[]>([]);
  const [sent, setSent] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seg, setSeg] = useState<Seg>('posts');

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;
    const sel = '*,market_posts(title,kind)';
    const [p, i, o] = await Promise.all([
      supabase.from('market_posts').select('*').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100),
      supabase.from('market_quotes').select(sel).eq('owner_id', uid).order('created_at', { ascending: false }).limit(100),
      supabase.from('market_quotes').select(sel).eq('bidder_id', uid).order('created_at', { ascending: false }).limit(100),
    ]);
    if (p.error || i.error || o.error) setError('Veriler yüklenemedi. Bağlantını kontrol et.'); else setError('');
    setPosts((p.data ?? []) as MarketPost[]); setInc((i.data ?? []) as unknown as Q[]); setSent((o.data ?? []) as unknown as Q[]);
    setLoading(false);
  }, [session]);
  useEffect(() => { void load(); }, [load]);

  // Panel kapanırken hemen yönlendirme iOS'ta yutulabiliyor: önce kapat, sonra git.
  const go = (path: string) => {
    if (onNavigate) { onNavigate(); setTimeout(() => router.push(path as never), 380); } else router.push(path as never);
  };
  const [refreshing, setRefreshing] = useState(false);
  if (!session) return <GuestGate icon="briefcase" text="İş ağı hesabını görmek için giriş yap." />;
  if (loading) return <RowSkeleton count={4} />;

  const open = posts.filter((x) => x.status === 'open').length;
  const waiting = inc.filter((x) => x.status === 'pending').length;
  const pendingBy = (id: string) => inc.filter((x) => x.post_id === id && x.status === 'pending').length;
  const title = (q: Q) => (Array.isArray(q.market_posts) ? q.market_posts[0]?.title : q.market_posts?.title) ?? 'İş ağı ilanı';
  const stats: [string, number, Seg][] = [['Açık ilan', open, 'posts'], ['Bekleyen teklif', waiting, 'incoming'], ['Verdiğim', sent.length, 'sent']];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}>
      <View style={s.head}>
        <View style={s.titleWrap}>
          <Label style={{ color: color.onNavy }}>İş ağı</Label>
          <PlainText style={s.h1}>HESABIM</PlainText>
        </View>
        <View style={s.stats}>
          {stats.map(([l, n, k], i) => (
            <Pressable key={l} style={[s.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: color.navy2 }, seg === k && s.statOn]} onPress={() => setSeg(k)} accessibilityRole="button">
              <PlainText style={s.statNum}>{String(n)}</PlainText>
              <Label style={{ color: color.onNavy }}>{l}</Label>
            </Pressable>
          ))}
        </View>
      </View>
      <Hatch height={6} />
      <View style={s.quick}>
        {([['briefcase', 'Firma profilim', '/ag/firma-kaydi'], ['truck', 'Envanterim', '/ag/envanter'], ['plus', 'Yeni ilan', '/ag/yeni']] as [IconName, string, string][]).map(([ic, l, to], i) => (
          <Pressable key={l} style={[s.q, i > 0 && { borderLeftWidth: 1, borderLeftColor: color.line }]} onPress={() => go(to)} accessibilityRole="button">
            <Icon name={ic} size={20} color={color.accent} />
            <Text style={s.qText}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <View style={{ margin: 12 }}><AlertBox variant="destructive">{error}</AlertBox></View> : null}

      <Label style={s.sec}>{seg === 'posts' ? 'İlanlarım' : seg === 'incoming' ? 'Gelen teklifler ve başvurular' : 'Verdiğim teklifler'}</Label>
      {seg === 'posts' ? (posts.length ? posts.map((p) => (
        <Pressable key={p.id} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => go(`/ag/ilan/${p.id}`)} accessibilityRole="button">
          <View style={s.cardTop}>
            <View style={{ flex: 1, gap: 3 }}>
              <Label style={{ color: color.accent }}>{POST_KINDS[p.kind] ?? p.kind}</Label>
              <Text style={s.title} numberOfLines={2}>{p.title}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <StatusBadge status={p.status} text={ST[p.status] ?? p.status} />
              {pendingBy(p.id) ? <Badge variant="default" icon="inbox">{`${pendingBy(p.id)} bekleyen`}</Badge> : null}
            </View>
          </View>
          <View style={s.strip}>
            <Cell label="İl" value={p.city} />
            <Cell label="Yayın" value={dateLabel(p.created_at.slice(0, 10))} left />
            <Cell label="Bütçe" value={p.price == null ? '–' : money(p.price, p.price_unit).replace(' toplam', '')} left />
          </View>
        </Pressable>
      )) : <Empty text="Henüz iş ağı ilanın yok." cta="İlk ilanını ver" onPress={() => go('/ag/yeni')} />) : null}

      {seg !== 'posts' ? ((seg === 'incoming' ? inc : sent).length ? (seg === 'incoming' ? inc : sent).map((q) => (
        <Pressable key={q.id} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => go(`/ag/ilan/${q.post_id}`)} accessibilityRole="button">
          <View style={s.cardTop}>
            <View style={{ flex: 1, gap: 3 }}>
              <Label style={{ color: color.accent }}>{seg === 'incoming' ? q.display_name : 'Verdiğim teklif'}</Label>
              <Text style={s.title} numberOfLines={2}>{title(q)}</Text>
            </View>
            <StatusBadge status={q.status} text={QUOTE_STATUS[q.status] ?? q.status} />
          </View>
          {q.note ? <Text style={s.noteLine} numberOfLines={2}>{q.note}</Text> : null}
          <View style={s.strip}>
            <Cell label="Tutar" value={money(q.amount, q.price_unit).replace(' toplam', '')} flex={1.4} />
            <Cell label="Tarih" value={new Date(q.created_at).toLocaleDateString('tr-TR')} left />
          </View>
        </Pressable>
      )) : <Empty text={seg === 'incoming' ? 'Henüz gelen teklif yok.' : 'Henüz teklif vermedin.'} cta="İş ağına göz at" onPress={() => { if (onNavigate) onNavigate(); else router.navigate('/is-agi'); }} />) : null}
    </ScrollView>
  );
}

function Cell({ label, value, flex = 1, left }: { label: string; value: string; flex?: number; left?: boolean }) {
  return (
    <View style={[s.cell, { flex }, left && { borderLeftWidth: 1, borderLeftColor: color.line }]}>
      <Label>{label}</Label>
      <Text style={s.val} numberOfLines={1}>{value || '–'}</Text>
    </View>
  );
}
function Empty({ text, cta, onPress }: { text: string; cta: string; onPress: () => void }) {
  return (
    <View style={s.emptyBox}>
      <Text style={s.emptyT}>{text}</Text>
      <Btn ghost title={cta} onPress={onPress} />
    </View>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: color.navy, paddingTop: 6 },
  titleWrap: { paddingHorizontal: 16, gap: 2 },
  h1: { color: '#fff', fontFamily: font.labelBold, fontSize: 38, letterSpacing: 0.8, lineHeight: 40 },
  stats: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: color.navy2 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, gap: 1, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  statOn: { backgroundColor: color.navy2, borderBottomColor: color.accent },
  statNum: { color: '#fff', fontFamily: font.bold, fontSize: 26 },
  quick: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  q: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 },
  qText: { fontSize: 13.5, fontWeight: '600', color: color.ink },
  noteLine: { paddingHorizontal: 12, paddingBottom: 10, color: color.muted, fontSize: 14 },
  sec: { marginHorizontal: 14, marginTop: 18, marginBottom: 8 },
  err: { color: color.bad, margin: 12 },
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  emptyBox: { marginHorizontal: 12, padding: 16, gap: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  emptyT: { color: color.muted },
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '600', color: color.ink },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  pillText: { fontSize: 12, fontWeight: '700' },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
});
