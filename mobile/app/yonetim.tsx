import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { Btn, Hatch, Label } from '../components/ui';
import { AlertBox, Badge, StatusBadge, Tabs } from '../components/kit';
import { router } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { color, font, radius } from '../lib/theme';

type L = { id: string; title: string; city: string; price: number; created_at: string; seller_id: string; listing_photos: { path: string; position: number }[] | null };
type R = { id: string; ticket: number; listing_id: string | null; reason: string; created_at: string };
type S = { id: string; kind: string; note: string | null; city: string | null; status: string; created_at: string; listing_title: string | null; full_name: string | null; phone: string | null; email: string | null };
type D = { id: string; kind: string; note: string; status: string; created_at: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null };
const KIND: Record<string, string> = { finans: 'Finansman', nakliye: 'Nakliye', ekspertiz: 'Ekspertiz' };
const DKIND: Record<string, string> = { export: 'Verimin kopyası', correct: 'Düzeltme', delete: 'Hesap ve veri silme', object: 'İşlemeye itiraz' };
type Tab = 'ilan' | 'sikayet' | 'talep' | 'veri';
type Stat = { label: string; icon: IconName; n: number | null };

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} sa önce` : `${Math.round(m / 1440)} gün önce`;
};

export default function Admin() {
  const { session } = useApp();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('ilan');
  const [ls, setLs] = useState<L[]>([]);
  const [sellers, setSellers] = useState<Record<string, string>>({});
  const [rs, setRs] = useState<R[]>([]);
  const [ss, setSs] = useState<S[]>([]);
  const [ds, setDs] = useState<D[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!session) { setAdmin(false); return; }
    void supabase.auth.getUser().then(({ data }) => setAdmin(data.user?.app_metadata?.role === 'admin'));
  }, [session]);

  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => { const r = await q; return r.error ? null : r.count ?? 0; };
  const load = useCallback(async () => {
    const week = new Date(Date.now() - 7 * 86400000).toISOString();
    const [l, r] = await Promise.all([
      supabase.from('listings').select('id,title,city,price,created_at,seller_id,listing_photos(path,position)').eq('moderation_status', 'pending').neq('status', 'removed').order('created_at'),
      supabase.from('reports').select('id,ticket,listing_id,reason,created_at').eq('status', 'open').order('created_at'),
    ]);
    if (l.error || r.error) { setError('Moderasyon verisi alınamadı veya erişim izni yok.'); return; }
    setError('');
    const lrows = (l.data ?? []) as unknown as L[];
    setLs(lrows); setRs((r.data ?? []) as R[]);
    const sr = await supabase.rpc('admin_service_requests');
    if (!sr.error && Array.isArray(sr.data)) setSs(sr.data as S[]);
    const dr = await supabase.from('data_requests').select('id,kind,note,status,created_at,profiles(full_name)').eq('status', 'open').order('created_at');
    if (!dr.error) setDs((dr.data ?? []) as unknown as D[]);
    const ids = [...new Set(lrows.map((x) => x.seller_id))];
    if (ids.length) {
      const p = await supabase.from('profiles').select('id,full_name').in('id', ids);
      const m: Record<string, string> = {};
      for (const x of (p.data ?? []) as { id: string; full_name: string | null }[]) m[x.id] = x.full_name ?? '—';
      setSellers(m);
    }
    const [users, active, newUsers, newListings, posts, quotes] = await Promise.all([
      count(supabase.from('profiles').select('id', { count: 'exact', head: true })),
      count(supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('moderation_status', 'approved')),
      count(supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', week)),
      count(supabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', week)),
      count(supabase.from('market_posts').select('id', { count: 'exact', head: true }).eq('status', 'open')),
      count(supabase.from('market_quotes').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    ]);
    setStats([
      { label: 'Üye', icon: 'users', n: users }, { label: 'Yayında ilan', icon: 'list', n: active }, { label: 'İş ağı ilanı', icon: 'briefcase', n: posts },
      { label: 'Bu hafta yeni üye', icon: 'user-plus', n: newUsers }, { label: 'Bu hafta yeni ilan', icon: 'plus-square', n: newListings }, { label: 'Bekleyen teklif', icon: 'send', n: quotes },
    ]);
  }, []);
  useEffect(() => { if (admin) void load(); }, [admin, load]);

  async function act(table: 'listings' | 'reports' | 'service_requests' | 'data_requests', id: string, values: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    const r = await supabase.from(table).update(values).eq('id', id).select('id').maybeSingle();
    setBusy(false);
    if (r.error || !r.data) { setError('İşlem kaydedilemedi. Yetkini ve bağlantını kontrol et.'); return; }
    void load();
  }
  const ask = (msg: string, fn: () => void) => Alert.alert('Onay', msg, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet', onPress: fn }]);

  if (admin === null) return <ActivityIndicator style={{ margin: 24 }} />;
  if (!admin) return <Text style={s.empty}>Bu bölüm yalnızca yetkili moderatörler içindir.</Text>;

  const newReq = ss.filter((x) => x.status === 'new').length;
  const tabs: [Tab, string, number][] = [['ilan', 'İlanlar', ls.length], ['sikayet', 'Şikayetler', rs.length], ['talep', 'Talepler', newReq], ['veri', 'KVKK', ds.length]];
  const todo = ls.length + rs.length + newReq + ds.length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}>
      <View style={s.head}>
        <Label style={{ color: color.onNavy }}>Yönetim paneli</Label>
        <PlainText style={s.h1}>{todo ? `${todo} İŞ BEKLİYOR` : 'HER ŞEY YOLUNDA'}</PlainText>
        <Text style={s.lead}>{todo ? 'Aşağıdaki sekmelerden inceleme bekleyenleri sonuçlandır.' : 'İnceleme bekleyen ilan, şikayet veya başvuru yok.'}</Text>
      </View>
      <Hatch height={7} />
      <View style={s.grid}>
        {stats.map((x) => (
          <View key={x.label} style={s.stat}>
            <Icon name={x.icon} size={16} color={color.accent} />
            <PlainText style={s.statNum}>{x.n == null ? '–' : String(x.n)}</PlainText>
            <Label>{x.label}</Label>
          </View>
        ))}
      </View>
      <Tabs value={tab} onChange={setTab} items={tabs.map(([id, label, count]) => ({ id, label, count }))} />
      {error ? <View style={{ padding: 12, paddingBottom: 0 }}><AlertBox variant="destructive">{error}</AlertBox></View> : null}

      <View style={{ padding: 12, gap: 10 }}>
        {tab === 'ilan' ? (ls.length ? ls.map((l) => {
          const ph = [...(l.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <View key={l.id} style={s.card}>
              <Pressable style={s.cardTop} onPress={() => router.push(`/ilan/${l.id}`)} accessibilityRole="button">
                {ph ? <Image source={{ uri: photoUrl(ph.path) }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: color.plate }]} />}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.title} numberOfLines={2}>{l.title}</Text>
                  <PlainText style={s.price}>{tl(l.price)}</PlainText>
                </View>
              </Pressable>
              <View style={s.strip}>
                <Cell label="Satıcı" value={sellers[l.seller_id] ?? '—'} flex={1.4} />
                <Cell label="İl" value={l.city} left />
                <Cell label="Geldi" value={ago(l.created_at)} left />
              </View>
              <View style={s.actions}>
                <View style={{ flex: 1 }}><Btn title="Onayla" disabled={busy} onPress={() => void act('listings', l.id, { moderation_status: 'approved' })} /></View>
                <View style={{ flex: 1 }}><Btn danger title="Reddet" disabled={busy} onPress={() => ask('İlan reddedilsin ve duraklatılsın mı?', () => void act('listings', l.id, { moderation_status: 'rejected', status: 'paused' }))} /></View>
              </View>
            </View>
          );
        }) : <Empty text="Bekleyen ilan yok." />) : null}

        {tab === 'sikayet' ? (rs.length ? rs.map((r) => (
          <View key={r.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={{ flex: 1, gap: 3 }}>
                <Label style={{ color: color.accent }}>{`ŞK-${r.ticket}`}</Label>
                <Text style={s.title}>{r.reason}</Text>
              </View>
              <Text style={s.when}>{ago(r.created_at)}</Text>
            </View>
            {r.listing_id ? <Pressable style={s.link} onPress={() => router.push(`/ilan/${r.listing_id}`)} accessibilityRole="button"><Icon name="external-link" size={15} color={color.accent} /><Text style={s.linkText}>Şikayet edilen ilanı aç</Text></Pressable> : null}
            <View style={s.actions}>
              <View style={{ flex: 1 }}><Btn title="Doğrula" disabled={busy} onPress={() => ask('Şikayet doğrulansın mı? Satıcının puanını etkiler.', () => void act('reports', r.id, { verified: true, status: 'resolved' }))} /></View>
              <View style={{ flex: 1 }}><Btn ghost title="Geçersiz" disabled={busy} onPress={() => void act('reports', r.id, { verified: false, status: 'dismissed' })} /></View>
            </View>
          </View>
        )) : <Empty text="Açık şikayet yok." />) : null}

        {tab === 'talep' ? (ss.length ? ss.map((q) => (
          <View key={q.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={{ flex: 1, gap: 3 }}>
                <Label style={{ color: color.accent }}>{KIND[q.kind] ?? q.kind}</Label>
                <Text style={s.title}>{q.listing_title ?? q.full_name ?? '—'}</Text>
              </View>
              <StatusBadge status={q.status} text={q.status === 'new' ? 'Yeni' : q.status === 'contacted' ? 'Görüşüldü' : 'Kapandı'} />
            </View>
            <View style={s.strip}>
              <Cell label="Kişi" value={q.full_name ?? '—'} flex={1.2} />
              <Cell label="Telefon" value={q.phone ?? '—'} left />
              <Cell label="İl" value={q.city ?? '—'} left />
            </View>
            {q.note ? <Text style={s.note}>{q.note}</Text> : null}
            <Text style={[s.when, { paddingHorizontal: 12, paddingBottom: 10 }]}>{q.email ?? ''} · {new Date(q.created_at).toLocaleString('tr-TR')}</Text>
            {q.status !== 'closed' ? (
              <View style={s.actions}>
                {q.status === 'new' ? <View style={{ flex: 1 }}><Btn ghost title="Görüşüldü" disabled={busy} onPress={() => void act('service_requests', q.id, { status: 'contacted' })} /></View> : null}
                <View style={{ flex: 1 }}><Btn ghost title="Kapat" disabled={busy} onPress={() => void act('service_requests', q.id, { status: 'closed' })} /></View>
              </View>
            ) : null}
          </View>
        )) : <Empty text="Hizmet talebi yok." />) : null}

        {tab === 'veri' ? (ds.length ? ds.map((d) => {
          const pf = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          const days = Math.max(0, 30 - Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000));
          return (
            <View key={d.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Label style={{ color: color.accent }}>{DKIND[d.kind] ?? d.kind}</Label>
                  <Text style={s.title}>{pf?.full_name ?? '—'}</Text>
                </View>
                <Badge variant={days <= 5 ? 'destructive' : 'warning'}>{`${days} gün kaldı`}</Badge>
              </View>
              {d.note ? <Text style={s.note}>{d.note}</Text> : null}
              <Text style={[s.when, { paddingHorizontal: 12, paddingBottom: 10 }]}>Başvuru: {new Date(d.created_at).toLocaleDateString('tr-TR')}</Text>
              <View style={s.actions}>
                <View style={{ flex: 1 }}><Btn title="Tamamlandı" disabled={busy} onPress={() => ask('Başvuru tamamlandı olarak işaretlensin mi? İşlemi önce yapmış olmalısın.', () => void act('data_requests', d.id, { status: 'done', handled_at: new Date().toISOString() }))} /></View>
                <View style={{ flex: 1 }}><Btn ghost title="Reddet" disabled={busy} onPress={() => ask('Başvuru reddedilsin mi? Gerekçeyi kullanıcıya ayrıca bildirmelisin.', () => void act('data_requests', d.id, { status: 'rejected', handled_at: new Date().toISOString() }))} /></View>
              </View>
            </View>
          );
        }) : <Empty text="Açık veri hakları başvurusu yok." />) : null}
      </View>
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
function Empty({ text }: { text: string }) {
  return <View style={s.emptyBox}><Icon name="check-circle" size={22} color={color.good} /><Text style={s.emptyT}>{text}</Text></View>;
}

const s = StyleSheet.create({
  empty: { textAlign: 'center', color: color.muted, margin: 24 },
  head: { backgroundColor: color.navy, padding: 16, gap: 4 },
  h1: { color: '#fff', fontFamily: font.labelBold, fontSize: 32, letterSpacing: 0.6, lineHeight: 34 },
  lead: { color: color.onNavy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  stat: { width: '33.333%', padding: 12, gap: 2, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.line },
  statNum: { fontFamily: font.labelBold, fontSize: 28, color: color.ink, lineHeight: 30 },
  tabs: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 3, borderTopColor: 'transparent' },
  tabOn: { backgroundColor: color.navy, borderTopColor: color.accent },
  tabText: { fontSize: 14, fontFamily: font.bold, color: color.ink },
  dot: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  err: { color: color.bad, margin: 12 },
  card: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  thumb: { width: 84, height: 66, borderRadius: radius },
  title: { fontSize: 16, fontWeight: '600', color: color.ink },
  price: { fontFamily: font.bold, fontSize: 18, color: color.accent },
  when: { color: color.muted, fontSize: 12.5 },
  note: { paddingHorizontal: 12, paddingVertical: 8, color: color.ink },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: color.line },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  linkText: { color: color.accent, fontWeight: '600' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  pillText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  emptyT: { color: color.ink },
});
