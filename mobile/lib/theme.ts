import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır: kömür gri zemin ve petrol yeşili ana renk.
const light = {
  navy: '#E5D7BC', navy2: '#CFBE9C', accent: '#0D7468', accentText: '#0A6257', accentInk: '#FFFFFF', accentSoft: '#CFE6DE',
  pop: '#0D7468', popInk: '#FFFFFF', popSoft: '#CFE6DE',
  teal: '#0D7468', tealInk: '#FFFFFF', tealSoft: '#CFE6DE', tealText: '#0A6257',
  bg: '#EDE5D6', surface: '#F7F1E6', plate: '#E2D7C2', ink: '#1E211C', muted: '#544F3C', line: '#D2C4A9',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#4D4734', onBar: '#1E211C',
} as const;
// Koyu görünüm: web ile aynı koyu palet.
const dark: Record<keyof typeof light, string> = {
  navy: '#100F0D', navy2: '#25221D', accent: '#117A70', accentText: '#5FD3C4', accentInk: '#FFFFFF', accentSoft: '#173B35',
  pop: '#117A70', popInk: '#FFFFFF', popSoft: '#173B35',
  teal: '#117A70', tealInk: '#FFFFFF', tealSoft: '#173B35', tealText: '#5FD3C4',
  bg: '#151412', surface: '#201E1A', plate: '#2C2924', ink: '#F5F0E6', muted: '#BDB4A3', line: '#3A362F',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#D4CAB7', onBar: '#FFFFFF',
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
