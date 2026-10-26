import { PART_GROUPS } from './data';

const ROAD = new Set(['Kamyon', 'Damperli kamyon', 'Kırkayak kamyon', 'Çekici (tır)', 'Kurtarıcı (oto çekici)', 'Tanker', 'Dorse / römork', 'Lowbed', 'Beton mikseri']);
const MACHINE_ONLY = new Set(['undercarriage', 'attachments', 'lifting']);
/** Seçilen araç türüne uygun parça grupları (web lib/parts.ts ile aynı kural). */
export function partGroupsFor(equipment: string) {
  if (equipment && ROAD.has(equipment)) return PART_GROUPS.filter((g) => !MACHINE_ONLY.has(g.id));
  return [...PART_GROUPS];
}
export const partGroupLabel = (id: string) => PART_GROUPS.find((g) => g.id === id)?.label ?? '';
export const partsSearchText = (v: string) => v.replace(/[^\p{L}\p{N}\s/\-]/gu, ' ').trim().slice(0, 100);
