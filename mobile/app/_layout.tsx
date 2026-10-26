import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../lib/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#6B1E2E' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ilan/[id]" options={{ title: 'İlan' }} />
        <Stack.Screen name="ilan-ver" options={{ title: 'İlan ver' }} />
        <Stack.Screen name="ilanlarim" options={{ title: 'İlanlarım' }} />
        <Stack.Screen name="mesaj/[id]" options={{ title: 'Mesajlar' }} />
        <Stack.Screen name="karsilastir" options={{ title: 'Karşılaştır' }} />
        <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="profil-duzenle" options={{ title: 'Profili düzenle' }} />
        <Stack.Screen name="kayitli-aramalar" options={{ title: 'Kayıtlı aramalar' }} />
      </Stack>
    </AppProvider>
  );
}
