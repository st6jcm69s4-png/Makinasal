import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { Btn, common } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { tl, supabase } from '../lib/supabase';

type L = { id: string; title: string; city: string; price: number; created_at: string };
type R = { id: string; ticket: number; listing_id: string | null; reason: string };
type S = { id: string; kind: string; note: string | null; city: string | null; status: string; created_at: string; listing_title: string | null; full_name: string | null; phone: string | null; email: string | null };
type D = { id: string; kind: string; note: string; status: string; created_at: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null };
const DKIND: Record<string, string> = { export: 'Verimin kopyası', correct: 'Düzeltme', delete: 'Silme', object: 'İtiraz' };
const KIND: Record<string, string> = { finans: 'Finansman', nakliye: 'Nakliye', ekspertiz: 'Ekspertiz' };

export default function Admin() {
  const { session } = useApp();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [ls, setLs] = useState<L[]>([]);
  const [rs, setRs] = useState<R[]>([]);
  const [ss, setSs] = useState<S[]>([]);
  const [ds, setDs] = useState<D[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) { setAdmin(false); return; }
    void supabase.auth.getUser().then(({ data }) => setAdmin(data.user?.app_metadata?.role === 'admin'));
  }, [session]);
  const load = useCallback(async () => {
    const [l, r] = await Promise.all([
      supabase.from('listings').select('id,title,city,price,created_at').eq('moderation_status', 'pending').neq('status', 'removed').order('created_at'),
      supabase.from('reports').select('id,ticket,listing_id,reason').eq('status', 'open').order('created_at'),
    ]);
    if (l.error || r.error) { setError('Moderasyon verisi alınamadı veya erişim izni yok.'); return; }
    setError(''); setLs((l.data ?? []) as L[]); setRs((r.data ?? []) as R[]);
    const sr = await supabase.rpc('admin_service_requests');
    if (!sr.error && Array.isArray(sr.data)) setSs(sr.data as S[]);
    const dr = await supabase.from('data_requests').select('id,kind,note,status,created_at,profiles(full_name)').eq('status', 'open').order('created_at');
    if (!dr.error) setDs((dr.data ?? []) as unknown as D[]);
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
  if (!admin) return <Text style={common.empty}>Bu bölüm yalnızca yetkili moderatörler içindir.</Text>;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      {error ? <Text style={common.err}>{error}</Text> : null}
      <Btn ghost title="Yenile" onPress={() => void load()} disabled={busy} />
      <Text style={common.h2}>İnceleme bekleyen ilanlar</Text>
      {ls.length === 0 ? <Text style={common.meta}>Bekleyen ilan yok.</Text> : null}
      {ls.map((l) => (
        <View key={l.id} style={common.card}>
          <Text style={common.title} onPress={() => router.push(`/ilan/${l.id}`)}>{l.title}</Text>
          <Text style={common.meta}>{l.city} · {tl(l.price)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1 }}><Btn title="Onayla" disabled={busy} onPress={() => void act('listings', l.id, { moderation_status: 'approved' })} /></View>
            <View style={{ flex: 1 }}><Btn danger title="Reddet" disabled={busy} onPress={() => ask('İlan reddedilsin ve duraklatılsın mı?', () => void act('listings', l.id, { moderation_status: 'rejected', status: 'paused' }))} /></View>
          </View>
        </View>
      ))}
      <Text style={common.h2}>Açık şikayetler</Text>
      {rs.length === 0 ? <Text style={common.meta}>Açık şikayet yok.</Text> : null}
      {rs.map((r) => (
        <View key={r.id} style={common.card}>
          <Text style={common.title}>ŞK-{r.ticket}</Text>
          <Text>{r.reason}</Text>
          {r.listing_id ? <Text style={{ color: '#800020' }} onPress={() => router.push(`/ilan/${r.listing_id}`)}>İlanı aç</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1 }}><Btn title="Doğrula" disabled={busy} onPress={() => ask('Şikayet doğrulansın mı? Satıcının puanını etkiler.', () => void act('reports', r.id, { verified: true, status: 'resolved' }))} /></View>
            <View style={{ flex: 1 }}><Btn ghost title="Geçersiz" disabled={busy} onPress={() => void act('reports', r.id, { verified: false, status: 'dismissed' })} /></View>
          </View>
        </View>
      ))}
      <Text style={common.h2}>Hizmet talepleri</Text>
      {ss.length === 0 ? <Text style={common.meta}>Talep yok.</Text> : null}
      {ss.map((q) => (
        <View key={q.id} style={common.card}>
          <Text style={common.title}>{KIND[q.kind] ?? q.kind} · {q.city ?? ''}</Text>
          {q.listing_title ? <Text>{q.listing_title}</Text> : null}
          <Text>{q.full_name ?? '—'} · {q.phone ?? '—'} · {q.email ?? '—'}</Text>
          {q.note ? <Text>{q.note}</Text> : null}
          <Text style={common.meta}>{new Date(q.created_at).toLocaleString('tr-TR')} · {q.status === 'new' ? 'Yeni' : q.status === 'contacted' ? 'Görüşüldü' : 'Kapandı'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {q.status === 'new' ? <View style={{ flex: 1 }}><Btn ghost title="Görüşüldü" disabled={busy} onPress={() => void act('service_requests', q.id, { status: 'contacted' })} /></View> : null}
            {q.status !== 'closed' ? <View style={{ flex: 1 }}><Btn ghost title="Kapat" disabled={busy} onPress={() => void act('service_requests', q.id, { status: 'closed' })} /></View> : null}
          </View>
        </View>
      ))}
      <Text style={common.h2}>Veri hakları başvuruları (KVKK, 30 gün)</Text>
      {ds.length === 0 ? <Text style={common.meta}>Açık başvuru yok.</Text> : null}
      {ds.map((d) => {
        const pf = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
        const days = Math.max(0, 30 - Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000));
        return (
          <View key={d.id} style={common.card}>
            <Text style={common.title}>{DKIND[d.kind] ?? d.kind} · {pf?.full_name ?? '—'}</Text>
            {d.note ? <Text>{d.note}</Text> : null}
            <Text style={common.meta}>{new Date(d.created_at).toLocaleDateString('tr-TR')} · yasal süreye {days} gün kaldı</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <View style={{ flex: 1 }}><Btn title="Tamamlandı" disabled={busy} onPress={() => ask('Başvuru tamamlandı olarak işaretlensin mi? İşlemi önce yapmış olmalısın.', () => void act('data_requests', d.id, { status: 'done', handled_at: new Date().toISOString() }))} /></View>
              <View style={{ flex: 1 }}><Btn ghost title="Reddet" disabled={busy} onPress={() => ask('Başvuru reddedilsin mi? Gerekçeyi kullanıcıya ayrıca bildirmelisin.', () => void act('data_requests', d.id, { status: 'rejected', handled_at: new Date().toISOString() }))} /></View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
