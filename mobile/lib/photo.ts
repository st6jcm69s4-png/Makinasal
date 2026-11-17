import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/*
 * İlan fotoğrafını yüklemeden önce küçültür: uzun kenar en fazla 1600 px, JPEG %72.
 * 12 MP'lik bir telefon fotoğrafı ~4-6 MB'tan ~250-400 KB'a iner; ilan sayfasında fark görülmez,
 * yükleme hızlanır, depolama ve veri kullanımı azalır. Küçültme başarısız olursa özgün fotoğraf kullanılır.
 */
const MAX = 1600;

export async function shrinkPhoto(uri: string, width?: number, height?: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const w = width ?? 0, h = height ?? 0;
    if (Math.max(w, h) > MAX || !w || !h) ctx.resize(w >= h ? { width: Math.min(MAX, w || MAX) } : { height: Math.min(MAX, h) });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
    return out.uri;
  } catch {
    return uri;
  }
}
