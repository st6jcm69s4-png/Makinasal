import { useEffect, useState } from 'react';
import { GuestGate } from '../components/LoginPrompt';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Text } from '../components/LText';
import { Btn, common } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';

const STATUS: Record<string, string> = { initializing: 'Hazırlanıyor', pending: 'Sonuç bekleniyor', review: 'Ödeme inceleniyor', paid: 'Ödeme alındı', failed: 'Ödeme tamamlanamadı' };
type Order = { id: string; buyer_id: string; title: string; amount_minor: number; status: string; created_at: string };
const money = (m: number) => `${(Number(m) / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`;

export default function Payments() {
  const { session } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    void supabase.from('payment_orders').select('id,buyer_id,title,amount_minor,status,created_at').order('created_at', { ascending: false }).limit(50).then((r) => {
      if (r.error) setError('Ödemeler yüklenemedi.'); else setOrders((r.data ?? []) as Order[]);
      setLoading(false);
    });
  }, [session]);
  if (!session) return <GuestGate icon="credit-card" text="Ödemelerini görmek için giriş yap." />;
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 8 }}>
      <Text style={common.meta}>Gönderdiğin ve aldığın ödemelerin doğrulanan durumu. Gerçek tahsilat henüz kullanıma açılmadı; kart bilgisi bu uygulamada istenmez.</Text>
      {error ? <Text style={common.err}>{error}</Text> : null}
      {!error && orders.length === 0 ? <Text style={common.meta}>Henüz bir ödeme kaydın yok.</Text> : null}
      {orders.map((o) => (
        <Pressable key={o.id} style={common.card} onPress={() => openWeb('/odeme?order=' + o.id)} accessibilityRole="button">
          <Text style={common.meta}>{o.buyer_id === session.user.id ? 'Gönderdiğim ödeme' : 'Aldığım ödeme'} · {new Date(o.created_at).toLocaleDateString('tr-TR')}</Text>
          <Text style={common.title}>{o.title}</Text>
          <Text style={common.price}>{money(o.amount_minor)}</Text>
          <Text>{STATUS[o.status] ?? o.status}</Text>
        </Pressable>
      ))}
      <Btn ghost title="Ödeme sürecini web'de incele" onPress={() => openWeb('/odeme')} />
    </ScrollView>
  );
}
