import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, common } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { money, POST_KINDS, QUOTE_STATUS, type MarketPost, type Quote } from '../../lib/network';
import { supabase } from '../../lib/supabase';

const ST: Record<string, string> = { open: 'Açık', closed: 'Kapalı', removed: 'Kaldırıldı' };

export default function MyNetwork() {
  const { session } = useApp();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [quotes, setQuotes] = useState<(Quote & { market_posts?: { title: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;
    void Promise.all([
      supabase.from('market_posts').select('*').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100),
      supabase.from('market_quotes').select('*').eq('bidder_id', uid).order('created_at', { ascending: false }).limit(100),
    ]).then(([p, q]) => {
      if (p.error || q.error) setError('Veriler yüklenemedi.');
      else { setPosts((p.data ?? []) as MarketPost[]); setQuotes((q.data ?? []) as Quote[]); }
      setLoading(false);
    });
  }, [session]);
  if (!session) return <Text style={common.empty}>Önce Hesabım sekmesinden giriş yap.</Text>;
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 8 }}>
      {error ? <Text style={common.err}>{error}</Text> : null}
      <Btn title="Firma / hizmet profilim" onPress={() => router.push('/ag/firma-kaydi' as never)} />
      <Btn ghost title="Yeni iş ağı ilanı" onPress={() => router.push('/ag/yeni' as never)} />
      <Text style={common.h2}>İlanlarım</Text>
      {posts.length === 0 ? <Text style={common.meta}>Henüz ilanın yok.</Text> : null}
      {posts.map((p) => (
        <Pressable key={p.id} style={common.card} onPress={() => router.push(`/ag/ilan/${p.id}` as never)} accessibilityRole="button">
          <Text style={common.title}>{p.title}</Text>
          <Text style={common.meta}>{POST_KINDS[p.kind]} · {ST[p.status]} · {p.city}</Text>
        </Pressable>
      ))}
      <Text style={common.h2}>Verdiğim teklifler</Text>
      {quotes.length === 0 ? <Text style={common.meta}>Henüz teklif vermedin.</Text> : null}
      {quotes.map((q) => (
        <Pressable key={q.id} style={common.card} onPress={() => router.push(`/ag/ilan/${q.post_id}` as never)} accessibilityRole="button">
          <Text style={common.title}>{q.display_name}</Text>
          <Text style={common.price}>{money(q.amount, q.price_unit)}</Text>
          <Text style={common.meta}>{QUOTE_STATUS[q.status]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
