import { Appearance, DynamicColorIOS, Platform } from 'react-native';
// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renk temaları: Petrol yeşili (varsayılan) ve Bordo. Açık/koyu görünüm her temada ayrıca seçilir.
type Palette = Record<
  'navy' | 'navy2' | 'accent' | 'accentText' | 'accentInk' | 'accentSoft' | 'pop' | 'popInk' | 'popSoft' | 'teal' | 'tealInk' | 'tealSoft' | 'tealText' |
  'bg' | 'surface' | 'plate' | 'ink' | 'muted' | 'line' | 'good' | 'goodBg' | 'warn' | 'warnBg' | 'bad' | 'badBg' | 'onNavy' | 'onBar' | 'barActive', string>;

// Petrol yeşili (varsayılan): sıcak kum tonları ve petrol yeşili.
const petrolLight: Palette = {
  navy: '#E5D7BC', navy2: '#CFBE9C', accent: '#0D7468', accentText: '#0A6257', accentInk: '#FFFFFF', accentSoft: '#CFE6DE',
  pop: '#0D7468', popInk: '#FFFFFF', popSoft: '#CFE6DE',
  teal: '#0D7468', tealInk: '#FFFFFF', tealSoft: '#CFE6DE', tealText: '#0A6257',
  bg: '#EDE5D6', surface: '#F7F1E6', plate: '#E2D7C2', ink: '#1E211C', muted: '#544F3C', line: '#D2C4A9',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#4D4734', barActive: '#0A6257', onBar: '#1E211C',
};
const petrolDark: Palette = {
  navy: '#100F0D', navy2: '#25221D', accent: '#117A70', accentText: '#5FD3C4', accentInk: '#FFFFFF', accentSoft: '#173B35',
  pop: '#117A70', popInk: '#FFFFFF', popSoft: '#173B35',
  teal: '#117A70', tealInk: '#FFFFFF', tealSoft: '#173B35', tealText: '#5FD3C4',
  bg: '#151412', surface: '#201E1A', plate: '#2C2924', ink: '#F5F0E6', muted: '#BDB4A3', line: '#3A362F',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#D4CAB7', barActive: '#5FD3C4', onBar: '#FFFFFF',
};
// Bordo: uygulamanın ilk tasarımı (grafit üst alan, sıcak beyaz zemin, bordo vurgu).
const bordoLight: Palette = {
  navy: '#25272D', navy2: '#34363D', accent: '#800020', accentText: '#800020', accentInk: '#FFFFFF', accentSoft: '#F0E4E6',
  pop: '#800020', popInk: '#FFFFFF', popSoft: '#F0E4E6',
  teal: '#800020', tealInk: '#FFFFFF', tealSoft: '#F0E4E6', tealText: '#800020',
  bg: '#F6F5F3', surface: '#FFFFFF', plate: '#EEECEA', ink: '#25272D', muted: '#5F5A63', line: '#DDD9DC',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#D5CDD2', barActive: '#F2C6D0', onBar: '#FFFFFF',
};
const bordoDark: Palette = {
  navy: '#202024', navy2: '#303036', accent: '#9E1B3A', accentText: '#E7B3BF', accentInk: '#FFFFFF', accentSoft: '#3A2329',
  pop: '#9E1B3A', popInk: '#FFFFFF', popSoft: '#3A2329',
  teal: '#9E1B3A', tealInk: '#FFFFFF', tealSoft: '#3A2329', tealText: '#E7B3BF',
  bg: '#181719', surface: '#242225', plate: '#302C30', ink: '#F4F1F2', muted: '#C0B8BE', line: '#484047',
  good: '#79D6A2', goodBg: '#173226', warn: '#F0C45E', warnBg: '#38300F', bad: '#F4A0A0', badBg: '#3B1C1C',
  onNavy: '#D5CDD2', barActive: '#E7B3BF', onBar: '#FFFFFF',
};

export const PALETTES = {
  petrol: { name: 'Petrol yeşili', light: petrolLight, dark: petrolDark },
  bordo: { name: 'Bordo', light: bordoLight, dark: bordoDark },
} as const;
export type PaletteId = keyof typeof PALETTES;

// Renk teması ve (Android'de) görünüm uygulama açılırken eşzamanlı okunur (renkler bir kez hesaplanır).
const PALETTE_FILE = 'mk-palette.txt';
export const THEME_FILE = 'mk-theme.txt';
function prefFile(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('expo-file-system') as { File: new (...p: unknown[]) => { exists: boolean; textSync(): string; write(t: string): void; create(): void }; Paths: { document: unknown } };
  return new fs.File(fs.Paths.document, name);
}
export function readPref(name: string): string {
  try { const f = prefFile(name); if (f.exists) return f.textSync().trim(); } catch { /* okunamazsa boş */ }
  return '';
}
export function writePref(name: string, v: string): boolean {
  try { const f = prefFile(name); if (!f.exists) f.create(); f.write(v); return true; } catch { return false; }
}
function readPalette(): PaletteId {
  const v = readPref(PALETTE_FILE);
  return v in PALETTES ? (v as PaletteId) : 'petrol';
}
/** Seçimi kaydeder; yeni renkler uygulama yeniden başlayınca geçerli olur. */
export function savePalette(id: PaletteId): boolean {
  return writePref(PALETTE_FILE, id);
}
export const activePalette: PaletteId = readPalette();
const light = PALETTES[activePalette].light;
const dark = PALETTES[activePalette].dark;

/** Gerçek renk değerleri (yerel başlık çubuğu gibi dinamik rengi okuyamayan yerler için). */
export const palettes = { light, dark } as const;
type ColorKey = keyof Palette;
// iOS: renkler sistem görünümüne (veya Ayarlar'daki seçime) göre anında değişir.
// Android: açılışta kayıtlı seçim (yoksa sistem) okunur; seçim değişince uygulama kendini yeniden başlatır.
const savedTheme = readPref(THEME_FILE);
const forced = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null;
if (Platform.OS === 'android' && forced) { try { Appearance.setColorScheme(forced); } catch { /* yok say */ } }
/** Android'de renklerin hesaplandığı görünüm. */
export const launchScheme: 'light' | 'dark' = forced ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
const pick = (k: ColorKey): string =>
  Platform.OS === 'ios'
    ? (DynamicColorIOS({ light: light[k], dark: dark[k] }) as unknown as string)
    : launchScheme === 'dark' ? dark[k] : light[k];
export const color = Object.fromEntries((Object.keys(light) as ColorKey[]).map((k) => [k, pick(k)])) as Record<ColorKey, string>;
/** Görünüm seçimi her iki platformda da var (Android'de yeniden başlatarak uygulanır). */
export const themeSupportsChoice = true;

export const radius = 12;
/** Yumuşak gölge: aşağı kayık, geniş blur. */
export const shadow = { shadowColor: '#0B1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 3 } as const;
export const hair = 1;

/** Yazı tipi aileleri (yüklenemezse sistem yazı tipine düşer). */
export const fontState = { ok: false };
export const font = {
  regular: 'Inter_400Regular', medium: 'Inter_500Medium', semi: 'Inter_600SemiBold', bold: 'Inter_700Bold',
  label: 'Inter_600SemiBold', labelBold: 'Inter_700Bold',
} as const;

/** Etiketler Türkçe büyük harfle yazılır (i→İ). */
export const caps = (s: string, lang: 'tr' | 'en' | 'de' = 'tr') => s.toLocaleUpperCase(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : 'tr-TR');
