/**
 * İlan kalite puanı (0-100): satıcıya ilanını güçlendirmek için neyin eksik olduğunu söyler.
 * Yalnızca satıcının kendi "İlanlarım" ekranında görünür.
 */
import { techFieldsFor } from './techSpecs';

export type ScoreInput = {
  category?: string | null; description?: string | null; year?: number | null; usage_value?: number | null;
  brand?: string | null; model?: string | null; video_url?: string | null; video_path?: string | null;
  tech?: Record<string, string | number> | null; listing_photos?: { path: string }[] | null;
};
export type Score = { score: number; tips: string[] };

export function listingScore(r: ScoreInput): Score {
  const tips: string[] = [];
  let score = 0;
  const part = r.category === 'Yedek parça' || r.category === 'Lastik ve jant';
  const photos = r.listing_photos?.length ?? 0;
  // Fotoğraf: 35 puan (8 ve üzeri tam puan)
  score += Math.min(photos, 8) / 8 * 35;
  if (photos < 5) tips.push('En az 5 fotoğraf ekle');
  else if (photos < 8) tips.push('8 fotoğrafa tamamla');
  // Açıklama: 20 puan
  const d = (r.description ?? '').trim().length;
  score += Math.min(d, 300) / 300 * 20;
  if (d < 150) tips.push('Açıklamayı ayrıntılandır');
  // Marka ve model: 10 puan
  if (r.brand) score += 5;
  if (r.model) score += 5;
  if (!r.brand || !r.model) tips.push('Marka ve modeli yaz');
  if (part) {
    // Parçada yıl / saat / teknik alan aranmaz: kalan 35 puan açıklama ve fotoğrafa göre ölçeklenir
    score = score / 65 * 100;
  } else {
    if (r.year) score += 7; else tips.push('Model yılını ekle');
    if (r.usage_value) score += 8; else tips.push('Çalışma saatini / km bilgisini ekle');
    const fields = techFieldsFor(r.category ?? '');
    const filled = fields.filter((f) => r.tech?.[f.key] !== undefined && r.tech?.[f.key] !== '').length;
    if (fields.length) {
      score += filled / fields.length * 10;
      if (filled < Math.min(3, fields.length)) tips.push('Teknik bilgileri doldur');
    } else score += 10;
    if (r.video_url || r.video_path) score += 10; else tips.push('Çalışırken video ekle');
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), tips: tips.slice(0, 3) };
}
