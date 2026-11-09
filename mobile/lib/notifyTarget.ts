const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Bildirim bağlantısını (web adresi biçiminde) uygulamadaki ekrana çevirir. */
export function notificationTarget(url: string): string | null {
  if (url === '/kayitli-aramalar' || url === '/destek') return url;
  const m = new RegExp(`^/(mesajlar|ilanlar|ag/ilan)/(${UUID})$`, 'i').exec(url);
  if (!m) return null;
  const k = m[1].toLowerCase();
  return k === 'mesajlar' ? `/mesaj/${m[2]}` : k === 'ag/ilan' ? `/ag/ilan/${m[2]}` : `/ilan/${m[2]}`;
}
