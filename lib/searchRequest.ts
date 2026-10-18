import type { Filters, SortKey } from './market';
import { categoryValues } from './machineryCatalog';
import { isPartCategory } from './pricing';
import { COORDS } from './data/constants';
import { distanceKm } from './geo';
export const SEARCH_PAGE_SIZE = 24;
export function searchRequest(f: Filters, sort: SortKey, page: number, city: string, since?: string) {
 const distances = Object.fromEntries(Object.keys(COORDS).map(c => [c, distanceKm(city,c) ?? 99999]));
 return { ...f, categories: f.cat==='Tümü'?[]:categoryValues(f.cat), part: isPartCategory(f.cat), sort,
 page: Math.max(1,Math.floor(page)||1), distances, since: since && Number.isFinite(Date.parse(since))?since:null };
}
