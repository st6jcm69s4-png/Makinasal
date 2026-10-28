import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır ve değiştirilmez.
const light = {
  navy: '#25272D', navy2: '#34363D', accent: '#800020', accentText: '#800020', accentInk: '#FFFFFF', accentSoft: '#F0EBEB',
  bg: '#F6F5F3', surface: '#FFFFFF', plate: '#EEECEA', ink: '#25272D', muted: '#66616A', line: '#DDD9DC',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#D5CDD2',
} as const;
// Koyu görünüm: web ile aynı koyu palet (açık görünümdeki renkler değişmez).
const dark: Record<keyof typeof light, string> = {
  navy: '#202024', navy2: '#303036', accent: '#800020', accentText: '#D4C7C9', accentInk: '#FFFFFF', accentSoft: '#33292B',
  bg: '#181719', surface: '#242225', plate: '#302C30', ink: '#F4F1F2', muted: '#C0B8BE', line: '#484047',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#D5CDD2',
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
  regular: 'Barlow_400Regular', medium: 'Barlow_500Medium', semi: 'Barlow_600SemiBold', bold: 'Barlow_700Bold',
  label: 'BarlowCondensed_600SemiBold', labelBold: 'BarlowCondensed_700Bold',
} as const;

/** Etiketler Türkçe büyük harfle yazılır (i→İ). */
export const caps = (s: string, lang: 'tr' | 'en' | 'de' = 'tr') => s.toLocaleUpperCase(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : 'tr-TR');
