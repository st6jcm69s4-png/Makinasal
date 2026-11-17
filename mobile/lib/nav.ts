import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { applyAppearance, getThemeChoice, subscribeThemeChoice, type ThemeChoice } from './themePref';
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';
import { color, launchScheme, palettes } from './theme';

/*
 * Telefonun kendi başlık çubuğu (Apple yönergesi: gezinme ve kontroller sistem parçalarıyla).
 * - Başlık ve geri oku sistem yazı tipiyle; marka renkleri yalnızca vurguda.
 * - Liste ekranlarında büyük başlık: kaydırınca küçülüp çubuğa yerleşir.
 * - Geri düğmesinde yalnızca ok (önceki sayfanın adı yazmaz, dar ekranda taşmaz).
 */
export const headerOptions = {
  headerStyle: { backgroundColor: color.bg },
  headerLargeStyle: { backgroundColor: color.bg },
  headerTintColor: color.accentText,
  headerTitleStyle: { color: color.ink },
  headerLargeTitleStyle: { color: color.ink },
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: color.bg },
};

export const useThemeChoice = (): ThemeChoice => useSyncExternalStore(subscribeThemeChoice, getThemeChoice, getThemeChoice);

/**
 * Şu anki görünüm (açık / koyu). iPhone'da Ayarlar'daki seçim ya da telefonun görünümü;
 * Android'de renkler açılışta hesaplandığı için açılıştaki görünüm.
 */
export function useScheme(): 'light' | 'dark' {
  const sys = useColorScheme();
  const c = useThemeChoice();
  if (Platform.OS !== 'ios') return launchScheme;
  if (c !== 'system') return c;
  return sys === 'dark' ? 'dark' : 'light';
}

/**
 * Başlık çubuğu renkleri.
 * - "Sistem" seçiliyken telefonun açık/koyu değişen rengi: telefon görünümü değiştirince başlık sayfayla aynı anda döner.
 * - Uygulamada Açık / Koyu seçiliyken düz renk: telefonun kendi başlık çubuğu bu seçimi görmüyor, aksi halde
 *   koyu görünümde üstte açık renkli bir şerit kalıyordu.
 */
export function useHeaderOptions() {
  const c = useThemeChoice();
  const scheme = useScheme();
  return useMemo(() => {
    if (Platform.OS === 'ios' && c === 'system') return headerOptions;
    const p = palettes[scheme];
    return {
      ...headerOptions,
      headerStyle: { backgroundColor: p.bg },
      headerLargeStyle: { backgroundColor: p.bg },
      headerTintColor: p.accentText,
      headerTitleStyle: { color: p.ink },
      headerLargeTitleStyle: { color: p.ink },
      contentStyle: { backgroundColor: p.bg },
    };
  }, [c, scheme]);
}

/**
 * Görünüm seçimini telefona uygular. Kök düzende bir kez kullanılır; başlık çubuğu yeni rengi aldığı
 * çizimden hemen sonra çalışır, böylece başlık ile sayfanın geri kalanı aynı anda değişir.
 */
export function useApplyTheme() {
  const c = useThemeChoice();
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; } // açılışta loadTheme uygular
    if (Platform.OS === 'ios') applyAppearance(c);
  }, [c]);
}

/** Gezinme bileşenlerinin renkleri (görünüme göre; "Sistem" seçiliyken iPhone'da telefonla aynı anda değişen renkler). */
export function useNavTheme(): Theme {
  const c = useThemeChoice();
  const scheme = useScheme();
  return useMemo(() => {
    const p = Platform.OS === 'ios' && c === 'system' ? color : palettes[scheme];
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, dark: scheme === 'dark', colors: { ...base.colors, primary: p.accentText, background: p.bg, card: p.bg, text: p.ink, border: p.line, notification: p.bad } };
  }, [c, scheme]);
}

/** Büyük başlıklı liste ekranı (iOS). Android'de normal başlık kalır. */
export const largeTitle = Platform.OS === 'ios' ? { headerLargeTitleEnabled: true } : {};

/** Gezinme bileşenlerinin renkleri uygulamanın paletinden (sekme geçişinde başlık düğmeleri titremesin). */
const base = launchScheme === 'dark' ? DarkTheme : DefaultTheme;
export const navTheme: Theme = {
  ...base,
  colors: { ...base.colors, primary: color.accentText, background: color.bg, card: color.bg, text: color.ink, border: color.line, notification: color.bad },
};

/** Başlık çubuğundaki yerel düğmeler için renk (useHeaderOptions ile aynı kural). */
export function useHeaderColor(k: keyof typeof palettes.light): string {
  const c = useThemeChoice();
  const scheme = useScheme();
  return Platform.OS === 'ios' && c === 'system' ? color[k] : palettes[scheme][k];
}
