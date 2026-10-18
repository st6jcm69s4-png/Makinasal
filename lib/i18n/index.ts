import english from './en.json' with { type: 'json' };
export type Language = 'tr' | 'en';
export const LANGUAGE_COOKIE = 'makinasal-language';
export const validLanguage = (value: unknown): Language => value === 'en' ? 'en' : 'tr';
const dictionary: Record<string, string> = english;
/** Exact app-copy translation. Never apply this to user names, listings, or message bodies. */
export function translate(value: string | null | undefined, language: Language, values?: Record<string, string | number>): string {
 if (!value) return value ?? '';
 const interpolate = (text: string) => text.replace(/\{(\w+)\}/g, (token, key: string) => values && key in values ? String(values[key]) : token);
 if (language === 'tr') return interpolate(value);
 const key = value.trim();
 const translated = Object.prototype.hasOwnProperty.call(dictionary,key) ? dictionary[key] : undefined;
 return interpolate(translated === undefined ? value : value.slice(0, value.indexOf(key)) + translated + value.slice(value.indexOf(key) + key.length));
}
export const localeFor = (language: Language) => language === 'en' ? 'en-GB' : 'tr-TR';
export const hasEnglish = (value: string) => Object.prototype.hasOwnProperty.call(dictionary, value.trim());
