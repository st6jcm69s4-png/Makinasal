import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır: kömür gri zemin ve petrol yeşili ana renk.
const light = {
  navy: '#D3E4E0', navy2: '#B6CEC9', accent: '#0B635C', accentText: '#0B635C', accentInk: '#FFFFFF', accentSoft: '#CFEDE8',
  pop: '#0B635C', popInk: '#FFFFFF', popSoft: '#CFEDE8',
  teal: '#0B635C', tealInk: '#FFFFFF', tealSoft: '#CFEDE8', tealText: '#0B635C',
  bg: '#E6EBEA', surface: '#F8FAFA', plate: '#D9E0DF', ink: '#1F2625', muted: '#505B59', line: '#C4CECC',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#46544F', onBar: '#16201D',
} as const;
// Koyu görünüm: web ile aynı koyu palet.
const dark: Record<keyof typeof light, string> = {
  navy: '#191C1E', navy2: '#2E3437', accent: '#14867B', accentText: '#5FD3C4', accentInk: '#FFFFFF', accentSoft: '#1E4A44',
  pop: '#14867B', popInk: '#FFFFFF', popSoft: '#1E4A4A',
  teal: '#14867B', tealInk: '#FFFFFF', tealSoft: '#1E4A4A', tealText: '#5FD3C4',
  bg: '#222628', surface: '#2C3134', plate: '#383E41', ink: '#F3F5F5', muted: '#B5BDBF', line: '#4A5154',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#CBD3D1', onBar: '#FFFFFF',
};
/** Gerçek renk değerleri (yerel başlık çubuğu gibi dinamik rengi okuyamayan yerler için). */
export const palettes = { light, dark } as const;
type ColorKey = keyof typeof light;
// iOS: renkler sistem görünümüne (veya Ayarlar'daki seçime) göre anında değişir.
// Android: uygulama açılırken sistem görünümü okunur.
const pick = (k: ColorKey): string =>
  Platform.OS === 'ios'
    ? (DynamicColorIOS({ light: light[k], dark: dark[k] }) as unknown as string)
    : Appearance.getColorScheme() === 'dark' ? dark[k] : light[k];
export const color = Object.fromEntries((Object.keys(light) as ColorKey[]).map((k) => [k, pick(k)])) as Record<ColorKey, string>;
export const themeSupportsChoice = Platform.OS === 'ios';

export const radius = 12;
/** Yumuşak gölge: aşağı kayık, geniş blur. */
export const shadow = { shadowColor: '#0B1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 2 } as const;
export const hair = 1;

/** Yazı tipi aileleri (yüklenemezse sistem yazı tipine düşer). */
export const fontState = { ok: false };
export const font = {
  regular: 'Inter_400Regular', medium: 'Inter_500Medium', semi: 'Inter_600SemiBold', bold: 'Inter_700Bold',
  label: 'Inter_600SemiBold', labelBold: 'Inter_700Bold',
} as const;

/** Etiketler Türkçe büyük harfle yazılır (i→İ). */
export const caps = (s: string, lang: 'tr' | 'en' | 'de' = 'tr') => s.toLocaleUpperCase(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : 'tr-TR');
