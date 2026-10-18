import { localeFor, type Language } from './i18n/index';
export const formatTL = (n: number, language: Language = 'tr') => `${Number(n).toLocaleString(localeFor(language))} ₺`;
export const formatNum = (n: number, language: Language = 'tr') => Number(n).toLocaleString(localeFor(language));
export const formatScore = (x: number | null | undefined, language: Language = 'tr') => x == null ? '–' : x.toLocaleString(localeFor(language), {minimumFractionDigits:1, maximumFractionDigits:1});
