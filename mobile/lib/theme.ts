import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır: kömür siyahı zemin, kraliyet mavisi ana renk, mandalina turuncusu vurgu.
const light = {
  navy: '#2B3440', navy2: '#3B4654', accent: '#2563EB', accentText: '#1D55D6', accentInk: '#FFFFFF', accentSoft: '#E5EEFF',
  pop: '#F28500', popInk: '#232A33', popSoft: '#FFEFD9',
  teal: '#0F766E', tealInk: '#FFFFFF', tealSoft: '#DDF3F0',
  bg: '#F2F5FA', surface: '#FFFFFF', plate: '#E6ECF5', ink: '#232A33', muted: '#56606F', line: '#D3DBE8',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#D2DAE6',
} as const;
// Koyu görünüm: web ile aynı koyu palet.
const dark: Record<keyof typeof light, string> = {
  navy: '#1F2630', navy2: '#323C4A', accent: '#3B73F5', accentText: '#9DBBFF', accentInk: '#FFFFFF', accentSoft: '#273C66',
  pop: '#FF9A1F', popInk: '#232A33', popSoft: '#4D3718',
  teal: '#1A9C91', tealInk: '#FFFFFF', tealSoft: '#1E4A4A',
  bg: '#252D38', surface: '#2F3946', plate: '#3A4655', ink: '#F3F6FA', muted: '#B7C1CF', line: '#4C596A',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#D2DAE6',
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
