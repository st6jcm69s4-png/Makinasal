import { Alert } from 'react-native';
import en from './en.json';
import extra from './en-extra';

export type Lang = 'tr' | 'en';
let current: Lang = 'tr';
const map = { ...(en as Record<string, string>), ...extra } as Record<string, string>;

export const getLang = () => current;
export const applyLang = (l: Lang) => { current = l; };

/** Türkçe metni seçili dile çevirir; çeviri yoksa metni olduğu gibi bırakır. Baştaki/sondaki boşluklar korunur. */
export function tr(value: string | null | undefined): string {
  if (!value) return value ?? '';
  if (current === 'tr') return value;
  const t = value.trim();
  if (!t) return value;
  const hit = map[t];
  if (hit === undefined) return value;
  const i = value.indexOf(t);
  return value.slice(0, i) + hit + value.slice(i + t.length);
}

// Alert pencerelerini de çevir.
const originalAlert = Alert.alert.bind(Alert);
Alert.alert = (title, message, buttons, options) =>
  originalAlert(tr(title), message ? tr(message) : message, buttons?.map((b) => ({ ...b, text: b.text ? tr(b.text) : b.text })), options);
