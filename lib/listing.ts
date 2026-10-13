import { KM_CATEGORIES } from './data/constants';
import type { Listing } from './data/types';
import { isPartCategory } from './pricing';
import { formatNum } from './format';

export const listingTitle = (l: Listing) => [l.brand, l.model].filter(Boolean).join(' ');

/** Çalışma saati / km etiketi; parça ve lastikte boş döner. */
export function usageLabel(l: Listing): string {
  if (isPartCategory(l.cat) || l.use == null) return '';
  const unit = l.unit || (KM_CATEGORIES.has(l.cat) ? 'km' : 'sa');
  return `${formatNum(l.use)} ${unit}`;
}

export const getListing = (all: Listing[], id: number) => all.find((l) => l.id === id) ?? null;
