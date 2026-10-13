import type { Listing } from './data/types';

const PART_CATEGORIES = ['Yedek parça', 'Lastik ve jant'];
export const isPartCategory = (cat: string) => PART_CATEGORIES.includes(cat);

export function median(a: number[]): number {
  const b = [...a].sort((x, y) => x - y);
  const n = b.length;
  return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
}

/** Kategori medyanı. Parça/lastikte hesaplanmaz; yeterli ilan yoksa null. */
export function categoryMedian(listings: Listing[], cat: string, minCount = 2): number | null {
  if (isPartCategory(cat)) return null;
  const prices = listings.filter((l) => l.cat === cat).map((l) => l.price);
  return prices.length >= minCount ? median(prices) : null;
}

export type PriceFlag = 'low' | 'high' | 'ok' | null;

/** fiyat/medyan <0.6 → düşük (dolandırıcılık uyarısı), >1.6 → yüksek */
export function priceFlag(listings: Listing[], price: number, cat: string): PriceFlag {
  const m = categoryMedian(listings, cat);
  if (!m) return null;
  const r = price / m;
  if (r < 0.6) return 'low';
  if (r > 1.6) return 'high';
  return 'ok';
}
