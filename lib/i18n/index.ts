import english from './en.json' with { type: 'json' };
import german from './de.json' with { type: 'json' };
export type Language = 'tr' | 'en' | 'de';
export const LANGUAGES: { code: Language; label: string; locale: string }[] = [
 { code: 'tr', label: 'Türkçe', locale: 'tr-TR' },
 { code: 'en', label: 'English', locale: 'en-GB' },
 { code: 'de', label: 'Deutsch', locale: 'de-DE' },
];
export const LANGUAGE_COOKIE = 'makinasal-language';
export const validLanguage = (value: unknown): Language => value === 'en' || value === 'de' ? value : 'tr';
/** Tarayıcının Accept-Language başlığından ilk ziyarette dil seçer; tanınmayan diller Türkçe kalır. */
export function detectLanguage(header: string | null | undefined): Language {
 for (const part of (header ?? '').split(',')) {
  const code = part.trim().slice(0, 2).toLowerCase();
  if (code === 'tr' || code === 'en' || code === 'de') return code;
 }
 return 'tr';
}
const dictionary: Record<string, string> = english;
const dictionaryDe: Record<string, string> = german;
const has = (d: Record<string, string>, key: string) => Object.prototype.hasOwnProperty.call(d, key);
/** Exact app-copy translation. Never apply this to user names, listings, or message bodies. Almanca eksikse İngilizceye, o da yoksa Türkçe metne düşer. */
export function translate(value: string | null | undefined, language: Language, values?: Record<string, string | number>): string {
 if (!value) return value ?? '';
 const interpolate = (text: string) => text.replace(/\{(\w+)\}/g, (token, key: string) => values && key in values ? String(values[key]) : token);
 if (language === 'tr') return interpolate(value);
 const key = value.trim();
 const translated = language === 'de' && has(dictionaryDe, key) ? dictionaryDe[key] : has(dictionary, key) ? dictionary[key] : undefined;
 return interpolate(translated === undefined ? value : value.slice(0, value.indexOf(key)) + translated + value.slice(value.indexOf(key) + key.length));
}
export const localeFor = (language: Language) => LANGUAGES.find(l => l.code === language)?.locale ?? 'tr-TR';
export const hasEnglish = (value: string) => has(dictionary, value.trim());
