import { Alert } from 'react-native';
import en from './en.json';
import extra from './en-extra';
import de from './de.json';
import deExtra from './de-extra';

export type Lang = 'tr' | 'en' | 'de';
export const LANGS: { code: Lang; label: string; locale: string }[] = [
  { code: 'tr', label: 'Türkçe', locale: 'tr-TR' },
  { code: 'en', label: 'English', locale: 'en-GB' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
];
export const localeOf = (l: Lang) => LANGS.find((x) => x.code === l)?.locale ?? 'tr-TR';
/** Telefonun diline göre ilk açılış dili; tanınmayan diller Türkçe kalır. */
export function detectLang(): Lang {
  try {
    const c = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase();
    return c === 'en' || c === 'de' || c === 'tr' ? c : 'tr';
  } catch { return 'tr'; }
}
let current: Lang = 'tr';
const map = { ...(en as Record<string, string>), ...extra } as Record<string, string>;
const mapDe = { ...(de as Record<string, string>), ...deExtra } as Record<string, string>;

export const getLang = () => current;
export const applyLang = (l: Lang) => { current = l; };

/** Türkçe metni seçili dile çevirir; çeviri yoksa metni olduğu gibi bırakır. Baştaki/sondaki boşluklar korunur. */
export function tr(value: string | null | undefined): string {
  if (!value) return value ?? '';
  if (current === 'tr') return value;
  const t = value.trim();
  if (!t) return value;
  // Almanca eksikse İngilizceye, o da yoksa Türkçe metne düşer.
  const hit = current === 'de' && mapDe[t] !== undefined ? mapDe[t] : map[t];
  if (hit === undefined) return value;
  const i = value.indexOf(t);
  return value.slice(0, i) + hit + value.slice(i + t.length);
}

// Alert pencerelerini de çevir.
const originalAlert = Alert.alert.bind(Alert);
Alert.alert = (title, message, buttons, options) =>
  originalAlert(tr(title), message ? tr(message) : message, buttons?.map((b) => ({ ...b, text: b.text ? tr(b.text) : b.text })), options);
