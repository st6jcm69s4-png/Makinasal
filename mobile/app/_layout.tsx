import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { color, fontState } from '../lib/theme';
import { largeTitle, useHeaderOptions, useNavTheme } from '../lib/nav';
import { BackButton } from '../components/BackButton';
import { ThemeProvider } from 'expo-router/react-navigation';
import { loadTheme, watchSystemTheme } from '../lib/themePref';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../lib/AppContext';
import { tr } from '../lib/i18n';
import { LangProvider, LanguageGate, useLang } from '../lib/lang';
import { LoginPromptProvider } from '../components/LoginPrompt';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { ToastHost } from '../components/Toast';
import { DoubleTapSearch } from '../components/DoubleTapSearch';
import { noteAppOpen } from '../lib/review';
import { installErrorReporting, reportError, setErrorRoute } from '../lib/errorReport';
import { Pressable, Text as RNText, View } from 'react-native';
import { usePushNotifications } from '../lib/push';
import { usePurchasesUser } from '../lib/purchases';
import { useApp } from '../lib/AppContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { usePathname, type ErrorBoundaryProps } from 'expo-router';

// Yakalanmamış hatalar kaydedilir (çökme takibi, bkz. lib/errorReport.ts)
installErrorReporting();

/**
 * Bir ekran hata verip çökerse: uygulama kapanmaz, sade bir "tekrar dene" ekranı çıkar ve hata kaydedilir.
 * Sağlayıcıların dışında çizildiği için yalnızca temel parçalar kullanılır.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { reportError(error, true); }, [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: color.bg }}>
      <RNText style={{ fontSize: 20, fontWeight: '600', color: color.ink, textAlign: 'center' }}>{tr('Bir şeyler ters gitti')}</RNText>
      <RNText style={{ fontSize: 15, color: color.muted, textAlign: 'center', lineHeight: 21 }}>{tr('Sorunu kaydettik ve inceleyeceğiz. Tekrar denemek ister misin?')}</RNText>
      <Pressable onPress={() => void retry()} accessibilityRole="button" style={({ pressed }) => [{ marginTop: 12, minHeight: 48, paddingHorizontal: 28, borderRadius: 14, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.85 }]}>
        <RNText style={{ color: color.accentInk, fontSize: 17, fontWeight: '600' }}>{tr('Tekrar dene')}</RNText>
      </Pressable>
    </View>
  );
}

function Screens() {
  useLang();
  // Anlık bildirimler: izin önceden verildiyse cihaz kaydedilir, bildirime dokununca ilgili ekran açılır
  const { session } = useApp();
  usePushNotifications(session?.user.id);
  usePurchasesUser(session?.user.id);
  // Hata kaydına hangi ekranda olunduğu eklenir
  const pathname = usePathname();
  useEffect(() => { setErrorRoute(pathname); }, [pathname]);
  // Başlıklar normal yazımla (Apple: başlıklar büyük harfle yazılmaz)
  const T = (x: string) => tr(x);
  const headerOptions = useHeaderOptions();
  const navTheme = useNavTheme();
  return (
    <>
      <StatusBar style="auto" />
      {/* Her sayfada çift dokunuş: arama ekranı */}
      <DoubleTapSearch>
      <ThemeProvider value={navTheme}>
      {/* Telefonun kendi başlık çubuğu (bkz. lib/nav.ts) */}
      <Stack
        screenOptions={() => ({
          ...headerOptions,
          /*
           * Sol üstte geri düğmesi.
           * iPhone: telefonun kendi geri düğmesi (iOS 26'da cam daire içinde ok). Kendi çizdiğimiz düğme iOS 26'nın
           * cam zemininde boş beyaz daire olarak görünüyor ve basmayı almıyordu.
           * Android: kendi düğmemiz (orada sorunsuz).
           */
          // Geri gidilebilir mi bilgisini başlığın kendisinden alırız: ekran açılmadan önce hesaplanınca (ilan önizlemesi
          // sayfayı önceden hazırlıyor) ilk açılışta "geri yok" sanılıp ev simgesi çıkıyordu.
          ...(Platform.OS === 'ios' ? {} : { headerLeft: (p: { canGoBack?: boolean }) => <BackButton canGoBack={!!p.canGoBack} /> }),
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ilan/[id]" options={{ title: T('İlan') }} />
        <Stack.Screen name="mesajlar" options={{ title: T('Mesajlar'), ...largeTitle }} />
        <Stack.Screen name="favoriler" options={{ title: T('Favorilerim'), ...largeTitle }} />
        <Stack.Screen name="ilan-ver" options={{ title: T('İlan ver') }} />
        <Stack.Screen name="ilanlarim" options={{ title: T('İlanlarım') }} />
        <Stack.Screen name="mesaj/[id]" options={{ title: T('Mesajlar') }} />
        <Stack.Screen name="karsilastir" options={{ title: T('Karşılaştır') }} />
        <Stack.Screen name="kontrol/[id]" options={{ title: T('Ekspertiz kontrol listesi') }} />
        <Stack.Screen name="afis/[id]" options={{ title: T('Satılık afişi') }} />
        <Stack.Screen name="karne/[id]" options={{ title: T('Makine karnesi') }} />
        <Stack.Screen name="rehber" options={{ title: T('Kullanım rehberi') }} />
        <Stack.Screen name="bildirimler" options={{ title: T('Bildirimler') }} />
        <Stack.Screen name="profil-duzenle" options={{ title: T('Profili düzenle') }} />
        <Stack.Screen name="kayitli-aramalar" options={{ title: T('Kayıtlı aramalar') }} />
        <Stack.Screen name="acik-artirmalar" options={{ title: T('Açık artırmalar') }} />
        <Stack.Screen name="ag/ilan/[id]" options={{ title: T('İş ağı ilanı') }} />
        <Stack.Screen name="ag/yeni" options={{ title: T('İş ağı ilanı') }} />
        <Stack.Screen name="ag/tanit" options={{ title: T('Kendini tanıt') }} />
        <Stack.Screen name="ag/hesabim" options={{ title: T('İş ağı hesabım') }} />
        <Stack.Screen name="ag/firma-kaydi" options={{ title: T('Firma profilim') }} />
        <Stack.Screen name="ag/envanter" options={{ title: T('Makinelerim ve araçlarım') }} />
        <Stack.Screen name="firma/[id]" options={{ title: T('Firma') }} />
        <Stack.Screen name="cekici" options={{ title: T('Çekici') }} />
        <Stack.Screen name="haklarim" options={{ title: T('Veri haklarım') }} />
        <Stack.Screen name="yedek-parca" options={{ title: T('Yedek parça') }} />
        <Stack.Screen name="magaza/[id]" options={{ title: T('Satıcı') }} />
        <Stack.Screen name="odemelerim" options={{ title: T('Ödemelerim') }} />
        <Stack.Screen name="premium" options={{ title: T('Premium') }} />
        <Stack.Screen name="asistan" options={{ title: T('Yapay zeka asistanı') }} />
        <Stack.Screen name="guven" options={{ title: T('Güven sistemi') }} />
        <Stack.Screen name="destek" options={{ title: T('Yardım') }} />
        <Stack.Screen name="hukuki/index" options={{ title: T('Hukuki bilgiler') }} />
        <Stack.Screen name="hukuki/[slug]" options={{ title: T('Hukuki bilgiler') }} />
        <Stack.Screen name="kayit" options={{ title: T('Üye ol') }} />
        <Stack.Screen name="sifremi-unuttum" options={{ title: T('Şifremi unuttum') }} />
        <Stack.Screen name="sifre-degistir" options={{ title: T('Şifreyi değiştir') }} />
        <Stack.Screen name="hesap-dogrula" options={{ title: T('Hesap güvenliği') }} />
        <Stack.Screen name="harita" options={{ title: T('İllere göre ilanlar') }} />
        <Stack.Screen name="yonetim" options={{ title: T('Yönetim') }} />
        <Stack.Screen name="hatalar" options={{ title: T('Uygulama hataları') }} />
        <Stack.Screen name="ayarlar" options={{ title: T('Ayarlar') }} />
        <Stack.Screen name="ara" options={{ title: T('Uygulamada ara') }} />
      </Stack>
      </ThemeProvider>
      </DoubleTapSearch>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, BarlowSemiCondensed_600SemiBold, BarlowSemiCondensed_700Bold });
  // Yazı tipi yüklenemese de (çevrimdışı vb.) uygulama sistem yazı tipiyle açılır.
  const [timedOut, setTimedOut] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => { void loadTheme().finally(() => setThemeReady(true)); }, []);
  useEffect(() => watchSystemTheme(), []);
  useEffect(() => { void noteAppOpen(); }, []);
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 2500); return () => clearTimeout(t); }, []);
  fontState.ok = !!loaded && !error;
  if ((!loaded && !error && !timedOut) || !themeReady) return null;
  return (
    <LangProvider>
      <AppProvider>
        <LoginPromptProvider>
          <Screens />
          <LanguageGate />
          <ToastHost />
          <OfflineBanner />
          <AnimatedSplash />
        </LoginPromptProvider>
      </AppProvider>
    </LangProvider>
  );
}
