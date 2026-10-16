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
  const live = listings.filter((l) => !l.demo);
  const source = live.length ? live : listings;
  const prices = source.filter((l) => l.cat === cat && Number.isFinite(l.price) && l.price > 0).map((l) => l.price);
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

/** Her kartta tüm listeyi taramamak için kategori bazında önceden hesaplanmış fiyat bilgisi. */
export type PriceStats = {
  count(cat: string): number;
  min(cat: string): number;
  max(cat: string): number;
  median(cat: string, minCount?: number): number | null;
  flag(price: number, cat: string): PriceFlag;
};

export function buildPriceStats(listings: Listing[]): PriceStats {
  const byCat = new Map<string, number[]>();
  const live = listings.filter((l) => !l.demo);
  for (const l of live.length ? live : listings) {
    if (!Number.isFinite(l.price) || l.price <= 0) continue;
    const arr = byCat.get(l.cat);
    if (arr) arr.push(l.price);
    else byCat.set(l.cat, [l.price]);
  }
  const prices = (cat: string) => byCat.get(cat) ?? [];
  const med = (cat: string, minCount = 2) => {
    if (isPartCategory(cat)) return null;
    const p = prices(cat);
    return p.length >= minCount ? median(p) : null;
  };
  return {
    count: (cat) => prices(cat).length,
    min: (cat) => Math.min(...prices(cat)),
    max: (cat) => Math.max(...prices(cat)),
    median: med,
    flag(price, cat) {
      const m = med(cat);
      if (!m) return null;
      const r = price / m;
      return r < 0.6 ? 'low' : r > 1.6 ? 'high' : 'ok';
    },
  };
}
