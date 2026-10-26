import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';

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
  const { favs } = useApp();
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
        tabBarStyle: { backgroundColor: '#25272D', borderTopWidth: 2, borderTopColor: '#800020', height: 62, paddingBottom: 6, paddingTop: 4 },
        tabBarItemStyle: { borderRadius: 8, marginHorizontal: 3, marginBottom: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Ana sayfa', tabBarIcon: tab('🏠') }} />
      <Tabs.Screen name="ilanlar" options={{ tabBarLabel: 'İlanlar', tabBarIcon: tab('🔎') }} />
      <Tabs.Screen name="is-agi" options={{ tabBarLabel: 'İş Ağı', tabBarIcon: tab('💼') }} />
      <Tabs.Screen name="favoriler" options={{ tabBarLabel: 'Favoriler', tabBarIcon: tab('♥'), tabBarBadge: favs.size > 0 ? favs.size : undefined, tabBarBadgeStyle: { backgroundColor: '#fff', color: '#800020', fontSize: 10 } }} />
      <Tabs.Screen name="mesajlar" options={{ tabBarLabel: 'Mesajlar', tabBarIcon: tab('💬') }} />
      <Tabs.Screen name="hesap" options={{ tabBarLabel: 'Hesabım', tabBarIcon: tab('👤') }} />
    </Tabs>
  );
}
