/*
 * Gelen bağlantıları uygulamanın sayfalarına çevirir (paylaşılan site bağlantıları, bildirimler).
 * Site ile uygulamanın adresleri bazı yerlerde farklı:
 *   makinasal.com/ilanlar/123        → ilan sayfası  (/ilan/123)
 *   makinasal.com/firmalar/abc       → firma sayfası (/firma/abc)
 *   makinasal.com/is-agi/ilan/xyz    → İş Ağı ilanı  (/ag/ilan/xyz)
 * Diğer adresler (/, /ilanlar, /is-agi, /magaza/…) uygulamada aynı yerdedir.
 * Alan adı bağlanınca iPhone ve Android bu bağlantıları doğrudan uygulamada açar (bkz. app.json, web /.well-known).
 */
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/ilanlar\/([^/?#]+)\/?$/, (m) => `/ilan/${m[1]}`],
  [/^\/firmalar\/([^/?#]+)\/?$/, (m) => `/firma/${m[1]}`],
  [/^\/is-agi\/ilan\/([^/?#]+)\/?$/, (m) => `/ag/ilan/${m[1]}`],
];

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // Tam adres (https://makinasal.com/…, makinasal://…) ya da yalnızca yol gelebilir
    let p = path;
    let query = '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) {
      const u = new URL(p);
      p = u.protocol === 'makinasal:' ? `/${u.host}${u.pathname}`.replace(/\/+$/, '') || '/' : u.pathname;
      query = u.search;
    } else {
      const q = p.indexOf('?');
      if (q >= 0) { query = p.slice(q); p = p.slice(0, q); }
    }
    for (const [re, to] of RULES) {
      const m = p.match(re);
      if (m) return to(m) + query;
    }
    return p + query;
  } catch {
    return path;
  }
}
