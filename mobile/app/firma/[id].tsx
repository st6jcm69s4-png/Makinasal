import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { common } from '../../components/ui';
import { dateLabel, EQUIPMENT_STATUS, money, PROVIDER_KINDS, type MarketPost, type Provider } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      setP((a.data as Provider) ?? null); setPosts((b.data ?? []) as MarketPost[]); setInv((c.data ?? []) as Row[]); setLoading(false);
    });
  }, [id]);
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  if (!p) return <Text style={common.empty}>Firma bulunamadı veya yayından kaldırıldı.</Text>;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={common.card}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{p.name}</Text>
        <Text style={common.meta}>{p.company_category ?? PROVIDER_KINDS[p.kind]} · {[p.city, p.district].filter(Boolean).join(' / ')}</Text>
        <Text style={{ marginTop: 6 }}>{p.description}</Text>
        <Text style={{ marginTop: 6 }}><Text style={{ fontWeight: '600' }}>Hizmet illeri: </Text>{p.service_cities.join(', ')}</Text>
        <Text><Text style={{ fontWeight: '600' }}>İş alanları: </Text>{p.specialties.join(', ')}</Text>
      </View>
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
