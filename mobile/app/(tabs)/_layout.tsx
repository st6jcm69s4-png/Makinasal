import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/LText';
import { useApp } from '../../lib/AppContext';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { supabase } from '../../lib/supabase';

// Ek paket gerektirmeyen basit simgeler.
const tab = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.7 }}>{glyph}</Text>
);

/** Üst başlık: web sitesindeki gibi lacivert zemin, bordo alt çizgi. */
function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: '#800020', fontSize: 22 }}>⚙</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>MAKİNASAL</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { favs, session } = useApp();
  useLang();
  // Okunmamış mesaj sayısı (30 sn'de bir yenilenir).
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!session) { setUnread(0); return; }
    let alive = true;
    const run = async () => {
      const { data, error } = await supabase.rpc('unread_counts');
      if (alive) setUnread(error || !Array.isArray(data) ? 0 : (data as { n: number | string }[]).reduce((a, r) => a + Number(r.n), 0));
    };
    void run();
    const t = setInterval(() => void run(), 30000);
    return () => { alive = false; clearInterval(t); };
  }, [session]);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#25272D', borderBottomWidth: 2, borderBottomColor: '#800020' } as object,
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitle: () => <Logo />,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#D5CDD2',
        tabBarActiveBackgroundColor: '#800020',
        tabBarStyle: { backgroundColor: '#25272D', borderTopWidth: 2, borderTopColor: '#800020', paddingHorizontal: 6, paddingTop: 4 },
        tabBarItemStyle: { borderRadius: 8, marginHorizontal: 2, marginVertical: 2, paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: tr('Ana sayfa'), tabBarIcon: tab('🏠') }} />
      <Tabs.Screen name="ilanlar" options={{ tabBarLabel: tr('İlanlar'), tabBarIcon: tab('🔎') }} />
      <Tabs.Screen name="is-agi" options={{ tabBarLabel: tr('İş Ağı'), tabBarIcon: tab('💼') }} />
      <Tabs.Screen name="favoriler" options={{ tabBarLabel: tr('Favoriler'), tabBarIcon: tab('♥'), tabBarBadge: favs.size > 0 ? favs.size : undefined, tabBarBadgeStyle: { backgroundColor: '#fff', color: '#800020', fontSize: 10 } }} />
      <Tabs.Screen name="mesajlar" options={{ tabBarLabel: tr('Mesajlar'), tabBarIcon: tab('💬'), tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: '#fff', color: '#800020', fontSize: 10 } }} />
      <Tabs.Screen name="hesap" options={{ tabBarLabel: tr('Hesabım'), tabBarIcon: tab('👤') }} />
    </Tabs>
  );
}
