import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
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

/**
 * Şu anki görünüm (açık / koyu). iPhone'da telefonun ya da Ayarlar'daki seçimin anlık değeri;
 * Android'de renkler açılışta hesaplandığı için açılıştaki görünüm.
 */
export function useScheme(): 'light' | 'dark' {
  const s = useColorScheme();
  if (Platform.OS !== 'ios') return launchScheme;
  return s === 'dark' ? 'dark' : 'light';
}

/**
 * Başlık çubuğu renkleri düz renk değeriyle verilir: telefonun kendi başlık çubuğu iPhone'un açık/koyu
 * değişen rengini okuyamıyor, koyu görünümde üstte açık renkli bir şerit kalıyordu.
 */
export function useHeaderOptions() {
  const scheme = useScheme();
  return useMemo(() => {
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
  }, [scheme]);
}

/** Gezinme bileşenlerinin renkleri (görünüme göre). */
export function useNavTheme(): Theme {
  const scheme = useScheme();
  return useMemo(() => {
    const p = palettes[scheme];
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, dark: scheme === 'dark', colors: { ...base.colors, primary: p.accentText, background: p.bg, card: p.bg, text: p.ink, border: p.line, notification: p.bad } };
  }, [scheme]);
}

/** Büyük başlıklı liste ekranı (iOS). Android'de normal başlık kalır. */
export const largeTitle = Platform.OS === 'ios' ? { headerLargeTitleEnabled: true } : {};

/** Gezinme bileşenlerinin renkleri uygulamanın paletinden (sekme geçişinde başlık düğmeleri titremesin). */
const base = launchScheme === 'dark' ? DarkTheme : DefaultTheme;
export const navTheme: Theme = {
  ...base,
  colors: { ...base.colors, primary: color.accentText, background: color.bg, card: color.bg, text: color.ink, border: color.line, notification: color.bad },
};
