import { categoryValues } from "./machineryCatalog";
import { CATEGORIES, CITIES } from "./data/constants";
import { defaultFilters, defaultUnit, MAX_PRICE, type Filters } from "./market";

export function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = defaultFilters();
  for (const key of Object.keys(defaults) as (keyof Filters)[]) {
    if (filters[key] !== undefined && filters[key] !== defaults[key])
      params.set(key, String(filters[key]));
  }
  return params;
}

export function filtersFromParams(
  params: Pick<URLSearchParams, "get">,
): Filters {
  const f = defaultFilters();
  const cat = params.get("cat");
  const city = params.get("city");
  if (cat && categoryValues(cat).length > 0) {
    f.cat = cat;
    f.unit = defaultUnit(cat);
  }
  if (city && (CITIES as readonly string[]).includes(city)) f.city = city;
  f.brand = (params.get("brand") ?? "").trim().slice(0, 100);
  f.q = (params.get("q") ?? "").slice(0, 200);
  if (params.get("unit") === "sa" || params.get("unit") === "km")
    f.unit = params.get("unit") as "sa" | "km";
  for (const key of ["useMin", "useMax", "yMin", "yMax"] as const) {
    const value = params.get(key);
    if (value && /^\d{1,10}$/.test(value)) f[key] = value;
  }
  for (const key of ["maxPrice", "minScore", "near"] as const) {
    const value = params.get(key);
    const n = Number(value);
    if (value !== null && Number.isFinite(n) && n >= 0)
      f[key] = Math.min(
        n,
        key === "minScore" ? 5 : key === "near" ? 3000 : MAX_PRICE,
      );
  }
  for (const key of ["incNew", "ver", "hide", "takas"] as const) {
    const value = params.get(key);
    if (value === "true" || value === "false") f[key] = value === "true";
  }
  return f;
}
