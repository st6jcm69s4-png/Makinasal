// Makinasal mobil tasarım dili: "ruhsat alanları".
// Her bilgi etiketli bir alanda durur: küçük, sıkı büyük harfli etiket + büyük değer, ince ortak çizgiler.
// Renkler web ile aynıdır ve değiştirilmez.
export const color = {
  navy: '#25272D', navy2: '#34363D', accent: '#800020', accentInk: '#FFFFFF', accentSoft: '#F0EBEB',
  bg: '#F6F5F3', surface: '#FFFFFF', plate: '#EEECEA', ink: '#25272D', muted: '#66616A', line: '#DDD9DC',
  good: '#1B6F40', goodBg: '#DCEFE3', warn: '#7F5200', warnBg: '#FFF0C2', bad: '#9C2626', badBg: '#F5DADA',
  onNavy: '#D5CDD2',
} as const;

export const radius = 4;
export const hair = 1;

/** Yazı tipi aileleri (yüklenemezse sistem yazı tipine düşer). */
export const fontState = { ok: false };
export const font = {
  regular: 'Barlow_400Regular', medium: 'Barlow_500Medium', semi: 'Barlow_600SemiBold', bold: 'Barlow_700Bold',
  label: 'BarlowCondensed_600SemiBold', labelBold: 'BarlowCondensed_700Bold',
} as const;

/** Etiketler Türkçe büyük harfle yazılır (i→İ). */
export const caps = (s: string, lang: 'tr' | 'en' = 'tr') => s.toLocaleUpperCase(lang === 'en' ? 'en-US' : 'tr-TR');
