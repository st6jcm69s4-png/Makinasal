import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../components/LText';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, common } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { useLoginPrompt } from '../../components/LoginPrompt';
import { dateLabel, EQUIPMENT_STATUS, money, PROVIDER_KINDS, type MarketPost, type Provider } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';
import { color } from '../../lib/theme';

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, netFavs, toggleNetFav } = useApp();
  const { askLogin, notify } = useLoginPrompt();
  const [stat, setStat] = useState<{ score: number; n: number } | null>(null);
  const [p, setP] = useState<Provider | null>(null);
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [inv, setInv] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void Promise.all([
      supabase.from('service_providers').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('market_posts').select('*').eq('owner_id', id).eq('status', 'open').order('created_at', { ascending: false }).limit(20),
      supabase.from('company_inventory').select('*').eq('owner_id', id).order('created_at', { ascending: false }).limit(50),
    ]).then(([a, b, c]) => {
      void supabase.from('user_stats').select('score,review_count').eq('id', id).maybeSingle().then((r) => { const d = r.data as { score: number | string; review_count: number | string } | null; if (d && Number(d.review_count) > 0) setStat({ score: Number(d.score), n: Number(d.review_count) }); });
      setP((a.data as Provider) ?? null); setPosts((b.data ?? []) as MarketPost[]); setInv((c.data ?? []) as Row[]); setLoading(false);
    });
  }, [id]);
  async function call() {
    if (!session) { askLogin('Firmanın telefon numarasını görmek için giriş yapman gerekir.'); return; }
    const { data, error } = await supabase.rpc('provider_phone', { p_provider: id });
    if (error || !data) { Alert.alert('Telefon', 'Bu firma telefon numarasını paylaşmıyor.'); return; }
    void Linking.openURL(`tel:${String(data).replace(/[^\d+]/g, '')}`);
  }
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  if (!p) return <Text style={common.empty}>Firma bulunamadı veya yayından kaldırıldı.</Text>;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={common.card}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{p.name}</Text>
        <Text style={common.meta}>{p.company_category ?? PROVIDER_KINDS[p.kind]} · {[p.city, p.district].filter(Boolean).join(' / ')}</Text>
        {stat ? <Text style={{ color: color.accentText, fontWeight: '700' }}>★ {stat.score.toFixed(1)} · {stat.n} değerlendirme</Text> : null}
        <Text style={{ marginTop: 6 }}>{p.description}</Text>
        <Text style={{ marginTop: 6 }}><Text style={{ fontWeight: '600' }}>Hizmet illeri: </Text>{p.service_cities.join(', ')}</Text>
        <Text><Text style={{ fontWeight: '600' }}>İş alanları: </Text>{p.specialties.join(', ')}</Text>
      </View>
      <Btn title="Telefonla ara" onPress={() => void call()} />
      <Btn ghost title={netFavs.has(`firm:${id}`) ? 'Favorilerde · çıkar' : 'Favorilere ekle'} onPress={async () => { const err = await toggleNetFav('firm', String(id)); if (err) notify('Favoriler', err, (a) => void a.toggleNetFav('firm', String(id))); }} />
      {inv.length ? <Text style={common.h2}>Envanter</Text> : null}
      {inv.map((i) => (
        <View key={String(i.id)} style={common.card}>
          <Text style={common.title}>{String(i.brand ?? '')} {String(i.model ?? '')}</Text>
          <Text style={common.meta}>{[i.category, i.quantity ? i.quantity + ' adet' : '', i.year, i.availability ? EQUIPMENT_STATUS[String(i.availability)] ?? i.availability : ''].filter(Boolean).join(' · ')}</Text>
        </View>
      ))}
      {posts.length ? <Text style={common.h2}>Açık ilanlar</Text> : null}
      {posts.map((x) => (
        <Pressable key={x.id} style={common.card} onPress={() => router.push(`/ag/ilan/${x.id}` as never)} accessibilityRole="button">
          <Text style={common.title}>{x.title}</Text>
          <Text style={common.price}>{money(x.price, x.price_unit)}</Text>
          {x.start_date ? <Text style={common.meta}>{dateLabel(x.start_date)}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}
