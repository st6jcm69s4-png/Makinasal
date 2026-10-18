import { containsProfanity, PROFANITY_ERROR } from './profanity';
export const IBAN_RE = /\bTR\s?\d{2}(\s?\d{4}){5}\s?\d{2}\b|\biban\b/i;
export const LINK_RE = /(https?:\/\/|www\.|wa\.me|t\.me|\.com\b|\.net\b|\.org\b)/i;
export const KAPORA_RE = /kapora|ön ödeme|on odeme|havale|\beft\b/i;

export type MessageCheck = { block: string | null; warn?: boolean };

/** IBAN ve link engellenir; kapora/ön ödeme/havale/eft uyarı verir. */
export function checkMessage(text: string): MessageCheck {
  if (containsProfanity(text)) return { block: PROFANITY_ERROR };
  if (IBAN_RE.test(text))
    return { block: 'Güvenliğin için mesajlarda IBAN paylaşımı engellenir. Ödemeyi ürünü gördükten sonra, satış sırasında yap.' };
  if (LINK_RE.test(text)) return { block: 'Güvenliğin için mesajlarda harici link paylaşımı engellenir.' };
  return { block: null, warn: KAPORA_RE.test(text) };
}
