import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeaderBack } from '../components/HeaderBack';
import { AppProvider } from '../lib/AppContext';
import { tr } from '../lib/i18n';
import { LangProvider, useLang } from '../lib/lang';

function Screens() {
  useLang();
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#25272D' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false, headerLeft: () => <HeaderBack />, contentStyle: { backgroundColor: '#F6F5F3' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ilan/[id]" options={{ title: tr('İlan') }} />
        <Stack.Screen name="ilan-ver" options={{ title: tr('İlan ver') }} />
        <Stack.Screen name="ilanlarim" options={{ title: tr('İlanlarım') }} />
        <Stack.Screen name="mesaj/[id]" options={{ title: tr('Mesajlar') }} />
        <Stack.Screen name="karsilastir" options={{ title: tr('Karşılaştır') }} />
        <Stack.Screen name="bildirimler" options={{ title: tr('Bildirimler') }} />
        <Stack.Screen name="profil-duzenle" options={{ title: tr('Profili düzenle') }} />
        <Stack.Screen name="kayitli-aramalar" options={{ title: tr('Kayıtlı aramalar') }} />
        <Stack.Screen name="ag/ilan/[id]" options={{ title: tr('İş ağı ilanı') }} />
        <Stack.Screen name="ag/yeni" options={{ title: tr('İş ağı ilanı') }} />
        <Stack.Screen name="ag/hesabim" options={{ title: tr('İş ağı hesabım') }} />
        <Stack.Screen name="ag/firma-kaydi" options={{ title: tr('Firma profilim') }} />
        <Stack.Screen name="ag/envanter" options={{ title: tr('Envanterim') }} />
        <Stack.Screen name="firma/[id]" options={{ title: tr('Firma') }} />
        <Stack.Screen name="yedek-parca" options={{ title: tr('Yedek parça') }} />
        <Stack.Screen name="magaza/[id]" options={{ title: tr('Satıcı') }} />
        <Stack.Screen name="odemelerim" options={{ title: tr('Ödemelerim') }} />
        <Stack.Screen name="premium" options={{ title: tr('Üyelik ve ilan hakları') }} />
        <Stack.Screen name="guven" options={{ title: tr('Güven sistemi') }} />
        <Stack.Screen name="destek" options={{ title: tr('Yardım') }} />
        <Stack.Screen name="hukuki/index" options={{ title: tr('Hukuki bilgiler') }} />
        <Stack.Screen name="hesap-dogrula" options={{ title: tr('Hesap güvenliği') }} />
        <Stack.Screen name="harita" options={{ title: tr('İl haritası') }} />
        <Stack.Screen name="yonetim" options={{ title: tr('Yönetim') }} />
        <Stack.Screen name="ayarlar" options={{ title: tr('Ayarlar') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LangProvider>
      <AppProvider>
        <Screens />
      </AppProvider>
    </LangProvider>
  );
}
