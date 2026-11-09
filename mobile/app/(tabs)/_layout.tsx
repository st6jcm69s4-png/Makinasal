import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View, type ColorValue } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { PlainText } from '../../components/LText';
import { BrandMark } from '../../components/BrandMark';
import { SwipeTabs, currentTab, goTab } from '../../components/SwipeTabs';
import { color, font } from '../../lib/theme';
import { useApp } from '../../lib/AppContext';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { supabase } from '../../lib/supabase';
import { fireScrollTop } from '../../lib/scrollTop';

/** Aktif sekme: ikonun arkasında dolu bir hap, ikon beyaz; pasifler sade. */
const icon = (name: IconName) => ({ focused }: { color: ColorValue | null; focused: boolean }) => (
  <View
    style={{
      width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? color.accent : 'transparent',
    }}
  >
    <Icon name={name} size={focused ? 20 : 21} color={focused ? color.accentInk : color.onNavy} />
  </View>
);

/** Sekme yazısı: aktifken kalın ve vurgu renginde. */
const label = (text: string) => ({ focused }: { focused: boolean }) => (
  <PlainText
    numberOfLines={1}
    style={{
      fontSize: 11.5, marginTop: 2, letterSpacing: 0.2,
      fontFamily: focused ? font.bold : font.label,
      color: focused ? color.barActive : color.onNavy,
    }}
  >
    {text}
  </PlainText>
);

/** Üst başlık: lacivert zemin, Barlow yazılı marka. */
function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={28} />
      <PlainText style={{ color: color.onBar, fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>MAKİNASAL</PlainText>
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
      screenListeners={({ route }) => ({
        // Açık sekmeye tekrar dokununca en üste çıkar; başka sekmeye geçerken önce açık ekran solar.
        tabPress: (e) => {
          if (route.name === currentTab()) { fireScrollTop(route.name); return; }
          e.preventDefault();
          goTab(route.name);
        },
      })}
      screenLayout={({ children, route }) => <SwipeTabs route={route.name}>{children}</SwipeTabs>}
      screenOptions={{
        // Geçiş animasyonunu SwipeTabs yürütür (önce açık ekran solar, sonra yenisi belirir)
        animation: 'none',
        sceneStyle: { backgroundColor: color.bg },
        headerStyle: { backgroundColor: color.navy, borderBottomWidth: 2, borderBottomColor: color.pop } as object,
        headerTintColor: color.onBar,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitle: () => <Logo />,
        headerRight: () => (
          <Pressable onPress={() => router.push('/ara' as never)} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Uygulamada ara')} style={{ paddingHorizontal: 16 }}>
            <Icon name="search" size={22} color={color.onBar} />
          </Pressable>
        ),
        tabBarActiveTintColor: color.barActive,
        tabBarInactiveTintColor: color.onNavy,
        tabBarStyle: { backgroundColor: color.navy, borderTopWidth: 1, borderTopColor: color.navy2, paddingTop: 6 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: label(tr('Ana sayfa')), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="ilanlar" options={{ tabBarLabel: label(tr('İlanlar')), tabBarIcon: icon('search') }} />
      <Tabs.Screen name="is-agi" options={{ tabBarLabel: label(tr('İş Ağı')), tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="favoriler" options={{ tabBarLabel: label(tr('Favoriler')), tabBarIcon: icon('heart'), tabBarBadge: favs.size > 0 ? favs.size : undefined, tabBarBadgeStyle: { backgroundColor: color.pop, color: color.popInk, fontSize: 10 } }} />
      <Tabs.Screen name="mesajlar" options={{ tabBarLabel: label(tr('Mesajlar')), tabBarIcon: icon('message-square'), tabBarBadge: unread > 0 ? unread : undefined, tabBarBadgeStyle: { backgroundColor: color.pop, color: color.popInk, fontSize: 10 } }} />
      <Tabs.Screen name="hesap" options={{ tabBarLabel: label(tr('Hesabım')), tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
