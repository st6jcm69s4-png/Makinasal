import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır: kömür siyahı zemin, kraliyet mavisi ana renk, mandalina turuncusu vurgu.
const light = {
  navy: '#1C1F23', navy2: '#2A2E34', accent: '#1D4ED8', accentText: '#1D4ED8', accentInk: '#FFFFFF', accentSoft: '#E7EDFC',
  pop: '#F28500', popInk: '#1C1F23', popSoft: '#FFEFD9',
  bg: '#F3F5F8', surface: '#FFFFFF', plate: '#E8ECF2', ink: '#1C1F23', muted: '#566070', line: '#D5DBE5',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#C9D1DD',
} as const;
// Koyu görünüm: web ile aynı koyu palet.
const dark: Record<keyof typeof light, string> = {
  navy: '#111316', navy2: '#22262B', accent: '#3B6CF0', accentText: '#8DAAFF', accentInk: '#FFFFFF', accentSoft: '#1A2442',
  pop: '#FF9A1F', popInk: '#1C1F23', popSoft: '#3A2A12',
  bg: '#121417', surface: '#1B1E23', plate: '#262B32', ink: '#F1F4F8', muted: '#AAB3C0', line: '#38404A',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#C9D1DD',
};
type ColorKey = keyof typeof light;
// iOS: renkler sistem görünümüne (veya Ayarlar'daki seçime) göre anında değişir.
// Android: uygulama açılırken sistem görünümü okunur.
const pick = (k: ColorKey): string =>
  Platform.OS === 'ios'
    ? (DynamicColorIOS({ light: light[k], dark: dark[k] }) as unknown as string)
    : Appearance.getColorScheme() === 'dark' ? dark[k] : light[k];
export const color = Object.fromEntries((Object.keys(light) as ColorKey[]).map((k) => [k, pick(k)])) as Record<ColorKey, string>;
export const themeSupportsChoice = Platform.OS === 'ios';

export const radius = 4;
export const hair = 1;

/** Yazı tipi aileleri (yüklenemezse sistem yazı tipine düşer). */
export const fontState = { ok: false };
export const font = {
  regular: 'Inter_400Regular', medium: 'Inter_500Medium', semi: 'Inter_600SemiBold', bold: 'Inter_700Bold',
  label: 'Inter_600SemiBold', labelBold: 'Inter_700Bold',
} as const;

/** Etiketler Türkçe büyük harfle yazılır (i→İ). */
export const caps = (s: string, lang: 'tr' | 'en' | 'de' = 'tr') => s.toLocaleUpperCase(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : 'tr-TR');
