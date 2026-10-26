import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeaderBack } from '../components/HeaderBack';
import { AppProvider } from '../lib/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#25272D' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false, headerLeft: () => <HeaderBack />, contentStyle: { backgroundColor: '#F6F5F3' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ilan/[id]" options={{ title: 'İlan' }} />
        <Stack.Screen name="ilan-ver" options={{ title: 'İlan ver' }} />
        <Stack.Screen name="ilanlarim" options={{ title: 'İlanlarım' }} />
        <Stack.Screen name="mesaj/[id]" options={{ title: 'Mesajlar' }} />
        <Stack.Screen name="karsilastir" options={{ title: 'Karşılaştır' }} />
        <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="profil-duzenle" options={{ title: 'Profili düzenle' }} />
        <Stack.Screen name="kayitli-aramalar" options={{ title: 'Kayıtlı aramalar' }} />
        <Stack.Screen name="ag/ilan/[id]" options={{ title: 'İş ağı ilanı' }} />
        <Stack.Screen name="ag/yeni" options={{ title: 'İş ağı ilanı' }} />
        <Stack.Screen name="ag/hesabim" options={{ title: 'İş ağı hesabım' }} />
        <Stack.Screen name="ag/firma-kaydi" options={{ title: 'Firma profilim' }} />
        <Stack.Screen name="ag/envanter" options={{ title: 'Envanterim' }} />
        <Stack.Screen name="firma/[id]" options={{ title: 'Firma' }} />
        <Stack.Screen name="yedek-parca" options={{ title: 'Yedek parça' }} />
        <Stack.Screen name="magaza/[id]" options={{ title: 'Satıcı' }} />
        <Stack.Screen name="odemelerim" options={{ title: 'Ödemelerim' }} />
        <Stack.Screen name="premium" options={{ title: 'Üyelik ve ilan hakları' }} />
        <Stack.Screen name="guven" options={{ title: 'Güven sistemi' }} />
        <Stack.Screen name="destek" options={{ title: 'Yardım' }} />
        <Stack.Screen name="hukuki/index" options={{ title: 'Hukuki bilgiler' }} />
        <Stack.Screen name="hesap-dogrula" options={{ title: 'Hesap güvenliği' }} />
        <Stack.Screen name="harita" options={{ title: 'İl haritası' }} />
        <Stack.Screen name="yonetim" options={{ title: 'Yönetim' }} />
        <Stack.Screen name="ayarlar" options={{ title: 'Ayarlar' }} />
      </Stack>
    </AppProvider>
  );
}
