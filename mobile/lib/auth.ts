import { SUPABASE_URL } from './supabase';

/** Yeni kayıt formu: avukat onayına kadar mağaza sürümünde kapalı kalır, test için .env'de EXPO_PUBLIC_SIGNUP_OPEN=true yapılır. */
export const SIGNUP_OPEN = process.env.EXPO_PUBLIC_SIGNUP_OPEN === 'true';
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';
/** Turnstile'ın doğruladığı alan adı (widget'ta ekli olmalı). */
export const CAPTCHA_ORIGIN = process.env.EXPO_PUBLIC_CAPTCHA_ORIGIN ?? 'https://makinasal.com';

export const PASSWORD_RULES = [
  { label: 'En az 8 karakter', test: (s: string) => [...s].length >= 8 },
  { label: 'En az bir büyük harf', test: (s: string) => /\p{Lu}/u.test(s) },
  { label: 'En az bir küçük harf', test: (s: string) => /\p{Ll}/u.test(s) },
  { label: 'En az bir rakam', test: (s: string) => /[0-9]/.test(s) },
  { label: 'En az bir özel karakter (. ! ? gibi)', test: (s: string) => /[^\p{L}\p{N}\s]/u.test(s) },
] as const;
export const passwordValid = (v: string) => v.length <= 128 && PASSWORD_RULES.every((r) => r.test(v));

/** +90 5XX… biçimine çevirir; geçersizse boş döner. */
export function normalizePhone(value: string) {
  const n = value.replace(/[\s()\-]/g, '');
  const d = n.startsWith('+90') ? n.slice(3) : n.startsWith('0090') ? n.slice(4) : n.startsWith('90') && n.length === 12 ? n.slice(2) : n.startsWith('0') ? n.slice(1) : n;
  return /^5[0-9]{9}$/.test(d) ? '+90' + d : '';
}

export type AuthProviders = { google: boolean; apple: boolean };
let cache: AuthProviders | null = null;
/** Supabase'de hangi giriş sağlayıcıları açık? Kapalıysa düğme gösterilmez. */
export async function fetchProviders(): Promise<AuthProviders> {
  if (cache) return cache;
  const none = { google: false, apple: false };
  try {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: key } });
    if (!r.ok) return none;
    const j = (await r.json()) as { external?: Record<string, boolean> };
    cache = { google: j.external?.google === true, apple: j.external?.apple === true };
    return cache;
  } catch { return none; }
}

/** Supabase hata metnini kullanıcıya anlaşılır Türkçeye çevirir. */
export function authMessage(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
  if (m.includes('captcha')) return 'Güvenlik doğrulaması tamamlanamadı. Kutuyu yenileyip tekrar dene.';
  if (m.includes('password')) return 'Şifre koşulları karşılanmıyor veya çok yaygın bir şifre. Başka bir şifre dene.';
  if (m.includes('rate') || m.includes('too many')) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (m.includes('signup') && m.includes('disabled')) return 'Yeni kayıtlar şu an kapalı.';
  return 'Kayıt tamamlanamadı. Bilgilerini kontrol edip tekrar dene.';
}
