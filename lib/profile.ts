import districts from "./data/turkeyDistricts";
export const COUNTRY = "Türkiye";
export const TURKEY_REGIONS: Readonly<Record<string, readonly string[]>> = districts;
export function districtsFor(city: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(TURKEY_REGIONS, city) ? TURKEY_REGIONS[city] : [];
}
export function validRegion(city: string, district: string) {
  if (!city) return !district;
  if (!Object.prototype.hasOwnProperty.call(TURKEY_REGIONS, city)) return false;
  return !district || districtsFor(city).includes(district);
}
export function capitalizeName(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/(^|[\s'’\-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("tr-TR"));
}
export function formatPersonName(value: string) {
  return capitalizeName(value.trim().replace(/\s+/gu, " "));
}
