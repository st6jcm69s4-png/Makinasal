export const PASSWORD_RULES = [
  { label: "En az 8 karakter", test: (s: string) => [...s].length >= 8 },
  { label: "En az bir büyük harf", test: (s: string) => /\p{Lu}/u.test(s) },
  { label: "En az bir küçük harf", test: (s: string) => /\p{Ll}/u.test(s) },
  { label: "En az bir rakam", test: (s: string) => /[0-9]/.test(s) },
  { label: "En az bir özel karakter (. ! ? gibi)", test: (s: string) => /[^\p{L}\p{N}\s]/u.test(s) },
] as const;
export function passwordValid(value: string) { return value.length <= 128 && PASSWORD_RULES.every(rule => rule.test(value)); }
export function normalizePhone(value: string) {
  const n = value.replace(/[\s()\-]/g, "");
  const digits = n.startsWith("+90") ? n.slice(3) : n.startsWith("0090") ? n.slice(4) : n.startsWith("90") && n.length === 12 ? n.slice(2) : n.startsWith("0") ? n.slice(1) : n;
  return /^5[0-9]{9}$/.test(digits) ? "+90" + digits : "";
}
export type AuthOptions = { google: boolean; apple: boolean; phone: boolean; emailConfirmation: boolean; registration: boolean };
export function parseAuthOptions(settings: { external?: Record<string, boolean>; mailer_autoconfirm?: boolean; phone_autoconfirm?: boolean; disable_signup?: boolean }): AuthOptions {
 const phone = settings.external?.phone === true && settings.phone_autoconfirm === false;
 const emailConfirmation = settings.external?.email === true && settings.mailer_autoconfirm === false;
 return { google: settings.external?.google === true, apple: settings.external?.apple === true, phone, emailConfirmation, registration: !settings.disable_signup && phone && emailConfirmation };
}

export function publicAuthOptions(value: unknown): AuthOptions {
 if (!value || typeof value !== 'object') throw new Error('Giriş seçenekleri okunamadı.');
 const v = value as Record<string, unknown>;
 const keys = ['google','apple','phone','emailConfirmation','registration'] as const;
 if (keys.some(key => typeof v[key] !== 'boolean')) throw new Error('Giriş seçenekleri okunamadı.');
 return Object.fromEntries(keys.map(key => [key, v[key]])) as AuthOptions;
}
