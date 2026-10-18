import type { Language } from './i18n/index';
import { KM_CATEGORIES } from './data/constants';
import type { Listing } from './data/types';
import { isPartCategory } from './pricing';
import { formatNum } from './format';

export const listingTitle = (l: Listing) => l.title || [l.brand, l.model].filter(Boolean).join(' ');

/** Kart ve başlıklarda gösterilen ad: "Marka Model · Yıl" (parça ve lastikte yıl yok). */
export function cardTitle(l: Listing): string {
  const base = listingTitle(l);
  if (isPartCategory(l.cat) || !l.year || base.includes(String(l.year))) return base;
  return `${base} · ${l.year}`;
}

/** Yeni → eski sıralaması için anahtar. Gerçek ilanlar (tarihli) demo ilanların önüne geçer. */
export const recency = (l: Listing): number => (l.createdAt ? Date.parse(l.createdAt) : Number(l.id) || 0);

/** Kullanım birimi: parça/lastikte boş; km kategorilerinde 'km', diğerlerinde 'sa'. */
export function usageUnit(l: Listing): 'sa' | 'km' | '' {
  if (isPartCategory(l.cat)) return '';
  if (l.unit === 'km' || l.unit === 'sa') return l.unit;
  return KM_CATEGORIES.has(l.cat) ? 'km' : 'sa';
}

/** Çalışma saati / km etiketi; parça ve lastikte boş döner. */
export function usageLabel(l: Listing, language: Language = 'tr'): string {
  if (isPartCategory(l.cat) || l.use == null) return '';
  return `${formatNum(l.use, language)} ${language === "en" && usageUnit(l) === "sa" ? "h" : usageUnit(l)}`;
}

export const getListing = (all: Listing[], id: number | string) => all.find((l) => String(l.id) === String(id)) ?? null;

/** Fiyatı düşen ilanlarda indirim yüzdesi (yoksa 0). */
export function dropPct(l: Listing): number {
  return l.prev && l.prev > l.price ? Math.round(((l.prev - l.price) / l.prev) * 100) : 0;
}

/** Aynı ilanın demo mu gerçek mi olduğuna göre benzersiz anahtar. */
export const listingKey = (l: Listing) => String(l.id);
