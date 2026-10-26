import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerStyle: { backgroundColor: '#6B1E2E' }, headerTintColor: '#fff', tabBarActiveTintColor: '#6B1E2E' }}>
      <Tabs.Screen name="index" options={{ title: 'İlanlar', tabBarLabel: 'İlanlar' }} />
      <Tabs.Screen name="is-agi" options={{ title: 'İş Ağı', tabBarLabel: 'İş Ağı' }} />
      <Tabs.Screen name="favoriler" options={{ title: 'Favoriler', tabBarLabel: 'Favoriler' }} />
      <Tabs.Screen name="mesajlar" options={{ title: 'Mesajlar', tabBarLabel: 'Mesajlar' }} />
      <Tabs.Screen name="hesap" options={{ title: 'Hesabım', tabBarLabel: 'Hesabım' }} />
    </Tabs>
  );
}
