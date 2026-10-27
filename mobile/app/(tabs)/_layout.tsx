import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { PlainText } from '../../components/LText';
import { font } from '../../lib/theme';
import { useApp } from '../../lib/AppContext';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { supabase } from '../../lib/supabase';
import { fireScrollTop } from '../../lib/scrollTop';

const icon = (name: IconName) => ({ color, focused }: { color: string; focused: boolean }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{ position: 'absolute', top: -9, width: 44, height: 3, backgroundColor: focused ? '#800020' : 'transparent' }} />
    <Icon name={name} size={21} color={color} />
  </View>
);

/** Üst başlık: lacivert zemin, Barlow yazılı marka. */
function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name="settings" size={20} color="#800020" />
      <PlainText style={{ color: '#fff', fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>MAKİNASAL</PlainText>
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
      screenListeners={({ route }) => ({ tabPress: () => fireScrollTop(route.name) })}
      screenOptions={{
        headerStyle: { backgroundColor: '#25272D', borderBottomWidth: 2, borderBottomColor: '#800020' } as object,
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitle: () => <Logo />,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#D5CDD2',
        tabBarStyle: { backgroundColor: '#25272D', borderTopWidth: 1, borderTopColor: '#34363D', paddingTop: 0 },
        tabBarItemStyle: { borderLeftWidth: 1, borderLeftColor: '#34363D', paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11.5, fontFamily: font.label, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: tr('Ana sayfa'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="ilanlar" options={{ tabBarLabel: tr('İlanlar'), tabBarIcon: icon('search') }} />
      <Tabs.Screen name="is-agi" options={{ tabBarLabel: tr('İş Ağı'), tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="favoriler" options={{ tabBarLabel: tr('Favoriler'), tabBarIcon: icon('heart'), tabBarBadge: favs.size > 0 ? favs.size : undefined, tabBarBadgeStyle: { backgroundColor: '#fff', color: '#800020', fontSize: 10 } }} />
      <Tabs.Screen name="mesajlar" options={{ tabBarLabel: tr('Mesajlar'), tabBarIcon: icon('message-square'), tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: '#fff', color: '#800020', fontSize: 10 } }} />
      <Tabs.Screen name="hesap" options={{ tabBarLabel: tr('Hesabım'), tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
