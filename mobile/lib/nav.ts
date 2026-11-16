import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';
import { color, launchScheme } from './theme';

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

/** Büyük başlıklı liste ekranı (iOS). Android'de normal başlık kalır. */
export const largeTitle = Platform.OS === 'ios' ? { headerLargeTitleEnabled: true } : {};

/** Gezinme bileşenlerinin renkleri uygulamanın paletinden (sekme geçişinde başlık düğmeleri titremesin). */
const base = launchScheme === 'dark' ? DarkTheme : DefaultTheme;
export const navTheme: Theme = {
  ...base,
  colors: { ...base.colors, primary: color.accentText, background: color.bg, card: color.bg, text: color.ink, border: color.line, notification: color.bad },
};
