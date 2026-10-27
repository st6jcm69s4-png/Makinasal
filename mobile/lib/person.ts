import type { Session } from '@supabase/supabase-js';
import { formatPersonName } from './regions';

/** Görünen ad: önce kullanıcı adı, yoksa isim. E-posta asla gösterilmez. */
export function displayName(session: Session | null, profileName?: string | null) {
  const m = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof m[k] === 'string' ? (m[k] as string).trim() : '');
  const username = pick('username') || pick('user_name') || pick('preferred_username');
  if (username) return username;
  const full = (profileName ?? '').trim() || pick('full_name') || pick('name');
  return full ? formatPersonName(full) : 'Üye';
}
/** İlk ad, her sözcüğün ilk harfi büyük (alperen → Alperen). */
export function firstName(display: string) {
  const w = formatPersonName(display.trim()).split(/\s+/)[0] ?? '';
  return w;
}
export function initials(display: string) {
  return display.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toLocaleUpperCase('tr-TR')).join('') || 'M';
}
