import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { PlainText } from '../../components/LText';
import { BrandMark } from '../../components/BrandMark';
import { SwipeTabs, currentTab } from '../../components/SwipeTabs';
import { color, font } from '../../lib/theme';
import { useApp } from '../../lib/AppContext';
import { tr } from '../../lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/** Ortadaki "İlan ver": menüden yükselen koyu daire. */
const postIcon = () => (
  <View style={{ width: 50, height: 50, marginTop: -14, borderRadius: 25, backgroundColor: color.navyDeep, borderWidth: 3, borderColor: color.navy, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name="plus" size={24} color={color.tealBright} />
  </View>
);

/** Başlıktaki simge düğmesi (isteğe bağlı sayı rozeti). */
function HeadBtn({ icon, label, badge, onPress }: { icon: IconName; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge}` : label} style={({ pressed }) => [{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.55 }]}>
      <Icon name={icon} size={21} color={color.onBar} />
      {badge ? (
        <View style={{ position: 'absolute', top: 3, right: 4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: color.pop, alignItems: 'center', justifyContent: 'center' }}>
          <PlainText style={{ color: color.popInk, fontSize: 10, lineHeight: 13, fontFamily: font.textBold }}>{badge > 99 ? '99+' : String(badge)}</PlainText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Sekmelerin üst çubuğu: logo solda, üç düğme sağda tek bir hap içinde.
 * Yerleşim tamamen burada (telefonun hazır başlığı düğmeleri dikeyde kaydırıyordu).
 */
function TabHeader({ unread, signedIn }: { unread: number; signedIn: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: color.navy, paddingTop: insets.top }}>
      <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 12 }}>
        <Logo />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 20, backgroundColor: color.navy2, paddingHorizontal: 4 }}>
          <HeadBtn icon="search" label={tr('Uygulamada ara')} onPress={() => router.push('/ara' as never)} />
          <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: color.onNavy, opacity: 0.35 }} />
          <HeadBtn icon="bell" label={tr('Bildirimler')} onPress={() => router.push(signedIn ? '/bildirimler' as never : '/hesap' as never)} />
          <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: color.onNavy, opacity: 0.35 }} />
          <HeadBtn icon="message-square" label={tr('Mesajlar')} badge={unread} onPress={() => router.push('/mesajlar' as never)} />
        </View>
      </View>
    </View>
  );
}

/** Üst başlık: lacivert zemin, Barlow yazılı marka. */
function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={28} />
      <PlainText style={{ color: color.onBar, fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>MAKİNA<PlainText style={{ color: color.barActive, fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>SAL</PlainText></PlainText>
    </View>
  );
}

export default function TabsLayout() {
  const { session } = useApp();
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
      // Açık sekmeye tekrar dokununca en üste çıkar; başka sekmeye dokununca anında geçer.
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          // Ortadaki düğme: ilan formunu açar (sekme değişmez)
          if (route.name === 'yeni') { e.preventDefault(); router.push('/ilan-ver' as never); return; }
          if (route.name === currentTab()) fireScrollTop(route.name);
        },
      })}
      screenLayout={({ children, route }) => <SwipeTabs route={route.name}>{children}</SwipeTabs>}
      screenOptions={{
        // Dokunmada geçiş anında; kaydırmada animasyonu SwipeTabs yürütür
        animation: 'none',
        sceneStyle: { backgroundColor: color.bg },
        // Mesajlar üstte, okunmamış sayısıyla (alt menüde yer açmak için)
        header: () => <TabHeader unread={unread} signedIn={!!session} />,
        tabBarActiveTintColor: color.barActive,
        tabBarInactiveTintColor: color.onNavy,
        tabBarStyle: { backgroundColor: color.navy, borderTopWidth: 1, borderTopColor: color.navy2, paddingTop: 6 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: label(tr('Ana sayfa')), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="ilanlar" options={{ tabBarLabel: label(tr('İlanlar')), tabBarIcon: icon('search') }} />
      <Tabs.Screen name="yeni" options={{ tabBarLabel: label(tr('İlan ver')), tabBarIcon: postIcon, tabBarAccessibilityLabel: tr('İlan ver') }} />
      <Tabs.Screen name="is-agi" options={{ tabBarLabel: label(tr('İş Ağı')), tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="hesap" options={{ tabBarLabel: label(tr('Hesabım')), tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
