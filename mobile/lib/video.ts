/** İlan videosu: yalnızca YouTube ve Vimeo bağlantıları (veritabanındaki kuralla aynı). */
const VIDEO_RE = /^https:\/\/((www|m)\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/|vimeo\.com\/)[A-Za-z0-9_?=&/.-]+$/i;

/** Kullanıcının yapıştırdığı bağlantıyı temizler; geçersizse null döner. Boş metin '' döner. */
export function normalizeVideoUrl(raw: string): string | null {
  let v = raw.trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  v = v.replace(/^http:\/\//i, 'https://');
  // Paylaşım bağlantılarındaki izleme parametrelerini (si=, feature=) at
  v = v.replace(/([?&])(si|feature|pp)=[^&]*/gi, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
  return v.length <= 300 && VIDEO_RE.test(v) ? v : null;
}

/** YouTube video kimliği (önizleme resmi için). */
export function youtubeId(url: string): string | null {
  // Yalnızca gerçek YouTube adresleri (alan adı başta sabit; "evil.com/?v=..." eşleşmez)
  const m = /^https:\/\/(?:(?:www|m)\.)?(?:youtu\.be\/([A-Za-z0-9_-]{6,})|youtube\.com\/(?:watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,})|shorts\/([A-Za-z0-9_-]{6,})))/i.exec(url);
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

export const videoThumb = (url: string): string | null => {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

export const videoHost = (url: string) => (/^https:\/\/(www\.)?vimeo\.com\//i.test(url) ? 'Vimeo' : 'YouTube');
