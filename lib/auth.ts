/** Only accept local paths, including after URL normalization. */
export function safeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || /[\\\r\n]/.test(value)) return '/ilanlar';
  try {
    const base = 'https://makinasal.invalid';
    const url = new URL(value, base);
    return url.origin === base && !url.pathname.startsWith('/auth/')
      ? url.pathname + url.search + url.hash : '/ilanlar';
  } catch { return '/ilanlar'; }
}

export function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-posta veya şifre hatalı.';
  if (m.includes('already registered')) return 'Bu e-posta ile bir hesap var. Giriş yapmayı dene.';
  if (m.includes('email not confirmed')) return 'Gelen kutundaki bağlantıyla e-postanı onayla.';
  if (m.includes('same_password')) return 'Öncekinden farklı bir şifre belirle.';
  if (m.includes('password')) return 'Şifren güvenlik koşullarını karşılamıyor. Daha uzun ve güçlü bir şifre dene.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  return 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
}
