import { translate, type Language } from './i18n/index';
import {categoryValues} from "./machineryCatalog";
import {
  brandMatches,
  categoryMatches,
  categoryLabel,
} from "./machineryCatalog";
import { KM_CATEGORIES } from "./data/constants";
import type { Listing, Seller } from "./data/types";
import { formatTL } from "./format";
import { distanceKm } from "./geo";
import { dropPct, recency, usageUnit } from "./listing";
import { isPartCategory, type PriceStats } from "./pricing";
import { trustLevel } from "./trust";

export const MAX_PRICE = 6_000_000;

export type Filters = {
  cat: string;
  brand?: string;
  city: string;
  maxPrice: number;
  unit: "sa" | "km";
  useMin: string;
  useMax: string;
  yMin: string;
  yMax: string;
  minScore: number;
  incNew: boolean;
  ver: boolean;
  hide: boolean;
  takas: boolean;
  near: number;
  q: string;
};

export const defaultFilters = (): Filters => ({
  cat: "Tümü",
  brand: "",
  city: "Tümü",
  maxPrice: MAX_PRICE,
  unit: "sa",
  useMin: "",
  useMax: "",
  yMin: "",
  yMax: "",
  minScore: 0,
  incNew: true,
  ver: false,
  hide: false,
  takas: false,
  near: 0,
  q: "",
});

export type SellerMap = Record<string, Seller>;
export type SortKey =
  "rec" | "new" | "near" | "drop" | "ua" | "yd" | "ya" | "trust" | "pa" | "pd";

export const SORTS: [SortKey, string][] = [
  ["rec", "Öne çıkanlar önce"],
  ["new", "En yeni ilan"],
  ["near", "Bana en yakın"],
  ["drop", "Fiyatı düşenler önce"],
  ["ua", "Kullanım: az olan önce"],
  ["yd", "Model yılı: yeniden eskiye"],
  ["ya", "Model yılı: eskiden yeniye"],
  ["trust", "Satıcı puanı: yüksek önce"],
  ["pa", "Fiyat: artan"],
  ["pd", "Fiyat: azalan"],
];

const nv = (x: string) => (x === "" ? null : Number(x));
const lower = (s: string) => s.toLocaleLowerCase("tr");

/** Premium satıcı veya tek ilan öne çıkarma (süresi dolmamış) */
export const isFeatured = (l: Listing, s?: Seller) => !!(s?.prem || l.boost);

export function filterListings(
  all: Listing[],
  sellers: SellerMap,
  f: Filters,
  myCity: string,
): Listing[] {
  const q = lower(f.q.trim());
  const uMin = nv(f.useMin),
    uMax = nv(f.useMax),
    yMin = nv(f.yMin),
    yMax = nv(f.yMax);
  const partMode = isPartCategory(f.cat);
  return all.filter((l) => {
    const m = sellers[l.sel];
    if (!m) return false;
    if (!categoryMatches(l.cat, f.cat)) return false;
    if (!brandMatches(l.brand, f.brand)) return false;
    if (f.city !== "Tümü" && l.city !== f.city) return false;
    if (f.maxPrice < MAX_PRICE && l.price > f.maxPrice) return false;
    if (!partMode) {
      if (uMin != null || uMax != null) {
        if (usageUnit(l) !== f.unit || l.use == null) return false;
        if (uMin != null && l.use < uMin) return false;
        if (uMax != null && l.use > uMax) return false;
      }
      if (yMin != null && (l.year == null || l.year < yMin)) return false;
      if (yMax != null && (l.year == null || l.year > yMax)) return false;
    }
    if (f.minScore > 0) {
      if (m.s == null) {
        if (!f.incNew) return false;
      } else if (m.s < f.minScore) return false;
    }
    if (f.near > 0) {
      const d = distanceKm(myCity, l.city);
      if (d == null || d > f.near) return false;
    }
    if (f.takas && !l.takas) return false;
    if (f.ver && !m.ver) return false;
    if (f.hide && trustLevel(m).label === "Riskli") return false;
    if (q) {
      const hay = lower(
        `${l.brand ?? ""} ${l.model ?? ""} ${l.title ?? ""} ${l.spec ?? ""} ${l.compat ?? ""}`,
      );
      const squash = (v: string) => v.replace(/[^a-z0-9]/g, "");
      const qs = squash(q);
      if (!hay.includes(q) && !(qs.length >= 3 && squash(hay).includes(qs))) return false;
    }
    return true;
  });
}

export function sortListings(
  list: Listing[],
  key: SortKey,
  sellers: SellerMap,
  myCity: string,
): Listing[] {
  const r = [...list];
  const dist = (l: Listing) => distanceKm(myCity, l.city) ?? 99999;
  const byNew = (a: Listing, b: Listing) => recency(b) - recency(a);
  switch (key) {
    case "pa":
      r.sort((a, b) => a.price - b.price);
      break;
    case "pd":
      r.sort((a, b) => b.price - a.price);
      break;
    case "trust":
      r.sort((a, b) => (sellers[b.sel]?.s ?? 0) - (sellers[a.sel]?.s ?? 0));
      break;
    case "near":
      r.sort((a, b) => dist(a) - dist(b));
      break;
    case "drop":
      r.sort((a, b) => dropPct(b) - dropPct(a) || byNew(a, b));
      break;
    case "ua":
      r.sort((a, b) =>
        usageUnit(a) === usageUnit(b)
          ? (a.use ?? 0) - (b.use ?? 0)
          : usageUnit(a) === "sa"
            ? -1
            : 1,
      );
      break;
    case "yd":
      r.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      break;
    case "ya":
      r.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
      break;
    case "rec":
      r.sort(
        (a, b) =>
          Number(isFeatured(b, sellers[b.sel])) -
            Number(isFeatured(a, sellers[a.sel])) || byNew(a, b),
      );
      break;
    default:
      r.sort(byNew);
  }
  return r;
}

export function filterLabel(f: Filters, language: Language = "tr"): string {
  const tr = (value: string) => translate(value, language);
  const p: string[] = [];
  if (f.brand) p.push(f.brand);
  if (f.cat !== "Tümü") p.push(tr(categoryLabel(f.cat)));
  if (f.q.trim()) p.push(`"${f.q.trim()}"`);
  if (f.city !== "Tümü") p.push(f.city);
  if (f.near > 0) p.push(language!=="tr" ? `within ${f.near} km` : `${f.near} km içinde`);
  if (f.yMin !== "" || f.yMax !== "")
    p.push(`${language!=="tr" ? "year" : "yıl"} ${f.yMin || "…"}–${f.yMax || "…"}`);
  if (f.useMin !== "" || f.useMax !== "")
    p.push(`${f.useMin || "0"}–${f.useMax || "…"} ${f.unit}`);
  if (f.minScore > 0) p.push(`${language!=="tr" ? "rating" : "puan"} ${String(f.minScore).replace(".", language!=="tr" ? "." : ",")}+`);
  if (f.maxPrice < MAX_PRICE) p.push(`${language!=="tr" ? "up to" : "en çok"} ${formatTL(f.maxPrice, language)}`);
  if (f.takas) p.push(tr("Takas olur"));
  if (f.ver) p.push(tr("Doğrulanmış"));
  return p.length ? p.join(" · ") : tr("Tüm ilanlar");
}

export function activeFilterCount(f: Filters): number {
  const part = isPartCategory(f.cat);
  return [
    f.cat !== "Tümü",
    !!f.brand,
    !part && (f.useMin !== "" || f.useMax !== ""),
    !part && (f.yMin !== "" || f.yMax !== ""),
    f.minScore > 0,
    f.city !== "Tümü",
    f.near > 0,
    f.maxPrice < MAX_PRICE,
    f.takas,
    f.ver,
    f.hide,
  ].filter(Boolean).length;
}

export const defaultUnit = (cat: string): "sa" | "km" =>
  categoryValues(cat).length > 0 &&
  categoryValues(cat).every((c) => KM_CATEGORIES.has(c))
    ? "km"
    : "sa";

export type Tag = { cls: "" | "good" | "warn" | "bad" | "prem"; text: string };

export function tagsFor(
  l: Listing,
  s: Seller | undefined,
  stats: PriceStats,
  language: Language = "tr",
): Tag[] {
  const t: Tag[] = [];
  if (s) {
    const lv = trustLevel(s);
    if (isFeatured(l, s)) t.push({ cls: "prem", text: "Öne çıkan" });
    t.push({ cls: lv.tone === "neutral" ? "" : lv.tone, text: lv.label });
    if (s.ver) t.push({ cls: "good", text: "Doğrulanmış satıcı" });
  }
  if (dropPct(l)) t.push({ cls: "good", text: translate("Fiyatı düştü −%{0}", language, {0:dropPct(l)}) });
  if (l.takas) t.push({ cls: "", text: "Takas olur" });
  const f = stats.flag(l.price, l.cat);
  if (f === "low") t.push({ cls: "bad", text: "Fiyat çok düşük, dikkat" });
  if (f === "high") t.push({ cls: "warn", text: "Fiyat ortalamanın üstünde" });
  if (l.isNew) t.push({ cls: "", text: "Yeni ilan" });
  else
    t.push({
      cls: "",
      text: l.conf === 0 ? "Bugün doğrulandı" : translate("{0} gün önce doğrulandı", language, {0:l.conf}),
    });
  return t.map(tag => ({...tag, text: translate(tag.text,language)}));
}

export type PriceIndicator =
  | { kind: "part" }
  | { kind: "few"; count: number }
  | {
      kind: "ok";
      count: number;
      min: number;
      max: number;
      median: number;
      mePct: number;
      medPct: number;
      diff: number;
    };

export function priceIndicator(l: Listing, stats: PriceStats): PriceIndicator {
  if (isPartCategory(l.cat)) return { kind: "part" };
  const count = stats.count(l.cat);
  if (count < 3) return { kind: "few", count };
  const min = stats.min(l.cat),
    max = stats.max(l.cat),
    median = stats.median(l.cat, 3) ?? 0;
  const span = Math.max(1, max - min);
  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - min) / span) * 100));
  return {
    kind: "ok",
    count,
    min,
    max,
    median,
    mePct: pct(l.price),
    medPct: pct(median),
    diff: median ? Math.round(((l.price - median) / median) * 100) : 0,
  };
}

export function checklistFor(l: Listing): string[] {
  const c = l.cat;
  if (c === "Yedek parça")
    return [
      "Satıcı doğrulanmış ve fatura veya fiş verecek",
      "Parça numarası makine modeline uyumlu",
      "Kutu, etiket ve ambalaj orijinal",
      "Çıkma veya revizyonlu ise garanti şartı yazılı",
      "Aşınma, çatlak, korozyon yok",
      "Test imkânı veya iade koşulu net",
    ];
  if (c === "Lastik ve jant")
    return [
      "Satıcı doğrulanmış ve fatura veya fiş verecek",
      "Ebat ile yük ve hız endeksi aracına uygun",
      "Üretim tarihi (DOT, 4 haneli) kabul edilebilir yaşta",
      "Diş derinliği ilanda yazanla aynı",
      "Yan duvarda kesik, şişme veya yarık yok",
      "Set alıyorsan aynı marka ve aşınma seviyesinde",
    ];
  const common = [
    "Seri veya şasi numarası makine üzerindeki plaka ve belgelerle aynı",
    "Fatura ve tescil/ruhsat belgeleri tam",
    "Satıcı belgedeki sahip veya yetkili vekil",
    "Haciz, rehin ve borç durumu sorgulandı",
  ];
  let spec: string[];
  if (c === "Ekskavatör" || c === "Beko Loder")
    spec = [
      "Hidrolik silindir ve hortumlarda yağ sızıntısı yok",
      "Palet, zincir veya lastiklerde aşırı aşınma yok",
      "Kol ve kova pim/burçlarında gözle görülür boşluk yok",
      "Soğuk motor sorunsuz çalışıyor, egzoz dumanı normal",
      "Saat göstergesi bakım kayıtlarıyla tutarlı",
      "Kumanda kolları, klima ve ışıklar çalışıyor",
    ];
  else if (c === "Vinç")
    spec = [
      "Halat ve kancada hasar ya da aşınma yok",
      "Ayak (stabilizatör) ve kol hidroliğinde sızıntı yok",
      "Yük momenti ve emniyet sistemleri çalışıyor",
      "Periyodik kontrol raporu güncel",
      "Saat göstergesi bakım kayıtlarıyla tutarlı",
    ];
  else if (c.startsWith("Beton"))
    spec = [
      "Mikser tamburu ve kanatlarda aşınma kontrol edildi",
      "Pompa boruları ve ağızlarında aşınma veya çatlak yok",
      "Hidrolik pompa ve silindirlerde sızıntı yok",
      "Şasi ve kaynak noktalarında çatlak yok",
      "Kilometre veya saat bakım kayıtlarıyla tutarlı",
    ];
  else if (c === "Forklift")
    spec = [
      "Mast, zincir ve çatallarda aşınma veya çatlak yok",
      "Hidrolik sistem sızıntısız",
      "Fren ve direksiyon sorunsuz",
      "Akü veya motor sorunsuz çalışıyor",
      "Saat göstergesi bakım kayıtlarıyla tutarlı",
    ];
  else {
    spec = [
      "Şasi ve kaynak noktalarında çatlak veya onarım izi yok",
      "Motor ve şanzımanda yağ kaçağı, aşırı duman yok",
      "Fren sistemi ve hava tankları sorunsuz",
      "Lastik diş derinliği ve üretim yılları (DOT) uygun",
      "Kilometre göstergesi servis kayıtlarıyla tutarlı",
    ];
    if (c === "Kamyon") spec.push("Kasa ve damper hidroliği sorunsuz");
    if (c.startsWith("Kurtarıcı"))
      spec.push("Kayar kasa, vinç hidroliği ve bağlama ekipmanları sorunsuz");
  }
  return [...common, ...spec];
}

/** Karşılaştırmada en iyi değerin indeksi (hepsi eşitse veya veri yoksa -1) */
export function bestIdx(
  vals: (number | null | undefined)[],
  mode: "min" | "max",
): number {
  let idx = -1,
    best: number | null = null;
  vals.forEach((v, i) => {
    if (v == null) return;
    if (best == null || (mode === "min" ? v < best : v > best)) {
      best = v;
      idx = i;
    }
  });
  const same = vals.filter((v) => v === best).length;
  return same === vals.length || best == null ? -1 : idx;
}

export const TAG_OPTIONS = [
  "İlana uygun çıktı",
  "Belgeler tamdı",
  "Hızlı cevap verdi",
  "Fiyat tutarlıydı",
] as const;
