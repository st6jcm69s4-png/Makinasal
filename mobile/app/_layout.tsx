import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { caps, color, fontState } from '../lib/theme';
import { loadTheme } from '../lib/themePref';
import { StatusBar } from 'expo-status-bar';
import { HeaderBack } from '../components/HeaderBack';
import { AppProvider } from '../lib/AppContext';
import { tr } from '../lib/i18n';
import { LangProvider, useLang } from '../lib/lang';
import { LoginPromptProvider } from '../components/LoginPrompt';

function Screens() {
  const { lang } = useLang();
  const T = (x: string) => caps(tr(x), lang);
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: '#25272D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: fontState.ok ? 'BarlowCondensed_700Bold' : undefined, fontSize: 22, letterSpacing: 0.8 },
          headerShadowVisible: false,
          // Her uygulamadaki gibi: sistemin kendi geri oku. Geçmiş yoksa (bağlantıyla açılınca) ana sayfaya dönen düğme.
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: navigation.canGoBack() ? undefined : () => <HeaderBack />,
          contentStyle: { backgroundColor: color.bg },
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ilan/[id]" options={{ title: T('İlan') }} />
        <Stack.Screen name="ilan-ver" options={{ title: T('İlan ver') }} />
        <Stack.Screen name="ilanlarim" options={{ title: T('İlanlarım') }} />
        <Stack.Screen name="mesaj/[id]" options={{ title: T('Mesajlar') }} />
        <Stack.Screen name="karsilastir" options={{ title: T('Karşılaştır') }} />
        <Stack.Screen name="bildirimler" options={{ title: T('Bildirimler') }} />
        <Stack.Screen name="profil-duzenle" options={{ title: T('Profili düzenle') }} />
        <Stack.Screen name="kayitli-aramalar" options={{ title: T('Kayıtlı aramalar') }} />
        <Stack.Screen name="ag/ilan/[id]" options={{ title: T('İş ağı ilanı') }} />
        <Stack.Screen name="ag/yeni" options={{ title: T('İş ağı ilanı') }} />
        <Stack.Screen name="ag/hesabim" options={{ title: T('İş ağı hesabım') }} />
        <Stack.Screen name="ag/firma-kaydi" options={{ title: T('Firma profilim') }} />
        <Stack.Screen name="ag/envanter" options={{ title: T('Envanterim') }} />
        <Stack.Screen name="firma/[id]" options={{ title: T('Firma') }} />
        <Stack.Screen name="cekici" options={{ title: T('Çekici') }} />
        <Stack.Screen name="haklarim" options={{ title: T('Veri haklarım') }} />
        <Stack.Screen name="yedek-parca" options={{ title: T('Yedek parça') }} />
        <Stack.Screen name="magaza/[id]" options={{ title: T('Satıcı') }} />
        <Stack.Screen name="odemelerim" options={{ title: T('Ödemelerim') }} />
        <Stack.Screen name="premium" options={{ title: T('Üyelik ve ilan hakları') }} />
        <Stack.Screen name="guven" options={{ title: T('Güven sistemi') }} />
        <Stack.Screen name="destek" options={{ title: T('Yardım') }} />
        <Stack.Screen name="hukuki/index" options={{ title: T('Hukuki bilgiler') }} />
        <Stack.Screen name="hukuki/[slug]" options={{ title: T('Hukuki bilgiler') }} />
        <Stack.Screen name="kayit" options={{ title: T('Üye ol') }} />
        <Stack.Screen name="hesap-dogrula" options={{ title: T('Hesap güvenliği') }} />
        <Stack.Screen name="harita" options={{ title: T('İl haritası') }} />
        <Stack.Screen name="yonetim" options={{ title: T('Yönetim') }} />
        <Stack.Screen name="ayarlar" options={{ title: T('Ayarlar') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  // Yazı tipi yüklenemese de (çevrimdışı vb.) uygulama sistem yazı tipiyle açılır.
  const [timedOut, setTimedOut] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => { void loadTheme().finally(() => setThemeReady(true)); }, []);
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 4000); return () => clearTimeout(t); }, []);
  fontState.ok = !!loaded && !error;
  if ((!loaded && !error && !timedOut) || !themeReady) return null;
  return (
    <LangProvider>
      <AppProvider>
        <LoginPromptProvider>
          <Screens />
        </LoginPromptProvider>
      </AppProvider>
    </LangProvider>
  );
}
