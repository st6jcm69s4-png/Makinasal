/**
 * İlan kalite puanı (0-100): satıcıya ilanını güçlendirmek için neyin eksik olduğunu söyler.
 * Yalnızca satıcının kendi "İlanlarım" ekranında görünür. Puan, aşağıdaki maddelerin toplamıdır;
 * her madde kendi açıklamasıyla gösterilir (neden bu puanı aldığı anlaşılsın diye).
 */
import { techFieldsFor } from './techSpecs';

export type ScoreInput = {
  category?: string | null; description?: string | null; year?: number | null; usage_value?: number | null;
  brand?: string | null; model?: string | null; video_url?: string | null; video_path?: string | null;
  tech?: Record<string, string | number> | null; listing_photos?: { path: string }[] | null;
};
/** Bir puan maddesi: başlık, alınan / en yüksek puan, durum açıklaması ve (eksikse) öneri. */
export type ScoreItem = { label: string; got: number; max: number; detail: string; tip?: string };
export type Score = { score: number; tips: string[]; items: ScoreItem[] };

export function listingScore(r: ScoreInput): Score {
  const part = r.category === 'Yedek parça' || r.category === 'Lastik ve jant';
  const items: ScoreItem[] = [];
  const photos = r.listing_photos?.length ?? 0;
  items.push({
    label: 'Fotoğraflar', max: 35, got: Math.min(photos, 8) / 8 * 35,
    detail: `${photos} / 8`,
    tip: photos < 5 ? 'En az 5 fotoğraf ekle' : photos < 8 ? '8 fotoğrafa tamamla' : undefined,
  });
  const d = (r.description ?? '').trim().length;
  items.push({
    label: 'Açıklama', max: 20, got: Math.min(d, 300) / 300 * 20,
    detail: `${d} / 300`,
    tip: d < 150 ? 'Açıklamayı ayrıntılandır' : undefined,
  });
  items.push({
    label: 'Marka ve model', max: 10, got: (r.brand ? 5 : 0) + (r.model ? 5 : 0),
    detail: [r.brand, r.model].filter(Boolean).join(' ') || '–',
    tip: !r.brand || !r.model ? 'Marka ve modeli yaz' : undefined,
  });
  if (!part) {
    items.push({ label: 'Model yılı', max: 7, got: r.year ? 7 : 0, detail: r.year ? String(r.year) : '–', tip: r.year ? undefined : 'Model yılını ekle' });
    items.push({ label: 'Çalışma saati / km', max: 8, got: r.usage_value ? 8 : 0, detail: r.usage_value ? String(r.usage_value) : '–', tip: r.usage_value ? undefined : 'Çalışma saatini / km bilgisini ekle' });
    const fields = techFieldsFor(r.category ?? '');
    const filled = fields.filter((f) => r.tech?.[f.key] !== undefined && r.tech?.[f.key] !== '').length;
    items.push({
      label: 'Teknik bilgiler', max: 10, got: fields.length ? filled / fields.length * 10 : 10,
      detail: fields.length ? `${filled} / ${fields.length}` : '–',
      tip: fields.length && filled < Math.min(3, fields.length) ? 'Teknik bilgileri doldur' : undefined,
    });
    const v = !!(r.video_url || r.video_path);
    items.push({ label: 'Video', max: 10, got: v ? 10 : 0, detail: v ? '✓' : '–', tip: v ? undefined : 'Çalışırken video ekle' });
  }
  const raw = items.reduce((a, x) => a + x.got, 0);
  const max = items.reduce((a, x) => a + x.max, 0);
  // Parçada yıl / saat / teknik alan / video aranmaz: toplam 100'e ölçeklenir
  const score = Math.max(0, Math.min(100, Math.round(raw / max * 100)));
  for (const x of items) x.got = Math.round(x.got);
  return { score, tips: items.map((x) => x.tip).filter((t): t is string => !!t).slice(0, 3), items };
}
