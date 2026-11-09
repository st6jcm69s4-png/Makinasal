/**
 * Makineye özel teknik alanlar (ilan formu, ilan sayfası, filtre ve karşılaştırma ortak kullanır).
 * Veritabanında listings.tech (jsonb) içinde saklanır: { anahtar: sayı | metin }.
 * Bu dosya web tarafında lib/techSpecs.ts ile aynı tutulmalıdır.
 */
import { CATEGORY_GROUPS } from './machineryCatalog';

export type TechField = {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'select' | 'text';
  options?: string[];
  /** Arama filtresinde gösterilsin mi */
  filter?: boolean;
};

const YESNO = ['Var', 'Yok'];
const W = (label = 'Çalışma ağırlığı'): TechField => ({ key: 'operating_weight', label, unit: 'ton', type: 'number', filter: true });
const HP: TechField = { key: 'engine_power', label: 'Motor gücü', unit: 'hp', type: 'number' };

export const TECH_BY_GROUP: Record<string, TechField[]> = {
  excavators: [
    W('Tonaj (çalışma ağırlığı)'),
    { key: 'undercarriage', label: 'Yürüyüş', type: 'select', options: ['Paletli', 'Lastikli'], filter: true },
    { key: 'dig_depth', label: 'Kazı derinliği', unit: 'm', type: 'number' },
    { key: 'bucket_capacity', label: 'Kova kapasitesi', unit: 'm³', type: 'number' },
    { key: 'hammer_line', label: 'Kırıcı tesisatı', type: 'select', options: YESNO, filter: true },
    { key: 'quick_coupler', label: 'Hızlı bağlantı', type: 'select', options: YESNO },
    HP,
  ],
  loaders: [W(), { key: 'bucket_capacity', label: 'Kova kapasitesi', unit: 'm³', type: 'number', filter: true }, { key: 'drive', label: 'Çekiş', type: 'select', options: ['4x4', '4x2'], filter: true }, HP],
  earthmoving: [W(), HP, { key: 'blade_width', label: 'Bıçak genişliği', unit: 'm', type: 'number' }],
  telehandlers: [
    { key: 'lift_capacity', label: 'Kaldırma kapasitesi', unit: 'ton', type: 'number', filter: true },
    { key: 'lift_height', label: 'Kaldırma yüksekliği', unit: 'm', type: 'number', filter: true },
    { key: 'drive', label: 'Çekiş', type: 'select', options: ['4x4', '4x2'] },
  ],
  forklifts: [
    { key: 'lift_capacity', label: 'Kapasite', unit: 'ton', type: 'number', filter: true },
    { key: 'lift_height', label: 'Kaldırma yüksekliği', unit: 'm', type: 'number', filter: true },
    { key: 'energy', label: 'Enerji türü', type: 'select', options: ['Dizel', 'LPG', 'Elektrik'], filter: true },
  ],
  cranes: [
    { key: 'lift_capacity', label: 'Kaldırma kapasitesi', unit: 'ton', type: 'number', filter: true },
    { key: 'boom_length', label: 'Bom uzunluğu', unit: 'm', type: 'number', filter: true },
    { key: 'carrier', label: 'Taşıyıcı', type: 'select', options: ['Lastikli', 'Paletli', 'Araç üstü', 'Sabit'] },
  ],
  platforms: [
    { key: 'working_height', label: 'Çalışma yüksekliği', unit: 'm', type: 'number', filter: true },
    { key: 'platform_capacity', label: 'Sepet kapasitesi', unit: 'kg', type: 'number' },
    { key: 'energy', label: 'Enerji türü', type: 'select', options: ['Dizel', 'Elektrik', 'Hibrit'], filter: true },
  ],
  concrete: [
    { key: 'boom_length', label: 'Bom uzunluğu', unit: 'm', type: 'number', filter: true },
    { key: 'output', label: 'Kapasite', unit: 'm³/saat', type: 'number', filter: true },
    { key: 'drum_volume', label: 'Tambur hacmi', unit: 'm³', type: 'number' },
  ],
  trucks: [
    { key: 'axle_config', label: 'Aks düzeni', type: 'select', options: ['4x2', '4x4', '6x2', '6x4', '6x6', '8x2', '8x4'], filter: true },
    { key: 'payload', label: 'Taşıma kapasitesi', unit: 'ton', type: 'number', filter: true },
    { key: 'body_type', label: 'Kasa tipi', type: 'select', options: ['Damper', 'Kasa', 'Tanker', 'Mikser', 'Çekici (tır)', 'Kurtarıcı', 'Diğer'], filter: true },
    { key: 'gearbox', label: 'Şanzıman', type: 'select', options: ['Manuel', 'Otomatik'] },
    HP,
  ],
  trailers: [
    { key: 'payload', label: 'Taşıma kapasitesi', unit: 'ton', type: 'number', filter: true },
    { key: 'axles', label: 'Dingil sayısı', type: 'number', filter: true },
    { key: 'length', label: 'Uzunluk', unit: 'm', type: 'number' },
  ],
  dumpers: [{ key: 'payload', label: 'Taşıma kapasitesi', unit: 'ton', type: 'number', filter: true }, { key: 'drive', label: 'Çekiş', type: 'select', options: ['4x4', '6x4', '6x6'] }, HP],
  road: [W(), { key: 'working_width', label: 'Çalışma genişliği', unit: 'm', type: 'number', filter: true }],
  drilling: [{ key: 'drill_depth', label: 'Delme derinliği', unit: 'm', type: 'number', filter: true }, { key: 'drill_diameter', label: 'Delme çapı', unit: 'mm', type: 'number' }],
  processing: [{ key: 'capacity', label: 'Kapasite', unit: 'ton/saat', type: 'number', filter: true }, HP],
  power: [{ key: 'power_kva', label: 'Güç', unit: 'kVA', type: 'number', filter: true }, { key: 'fuel', label: 'Yakıt', type: 'select', options: ['Dizel', 'Benzin', 'Elektrik', 'Doğalgaz'] }],
  agriculture: [HP, { key: 'drive', label: 'Çekiş', type: 'select', options: ['4x4', '4x2'], filter: true }],
};

/** Tüm makinelerde ortak bakım ve durum beyanı (satıcı beyanı olarak gösterilir). */
export const CONDITION_FIELDS: TechField[] = [
  { key: 'last_service', label: 'Son bakım (ay/yıl)', type: 'text' },
  { key: 'service_records', label: 'Bakım kayıtları', type: 'select', options: ['Var', 'Kısmen var', 'Yok'] },
  { key: 'damage', label: 'Hasar / boya', type: 'select', options: ['Hasarsız, boyasız', 'Boyalı parça var', 'Hasar kaydı var'] },
  { key: 'replaced_parts', label: 'Revize / değişen parçalar', type: 'text' },
];

export const groupOf = (category: string) => CATEGORY_GROUPS.find((g) => (g.categories as readonly string[]).includes(category))?.id ?? null;
export const techFieldsFor = (category: string): TechField[] => {
  const g = groupOf(category);
  return g ? TECH_BY_GROUP[g] ?? [] : [];
};

export type TechValues = Record<string, string | number>;

/** Formdaki metin değerlerini kaydedilecek nesneye çevirir (boşları atar, sayıları sayı yapar). */
export function cleanTech(category: string, raw: Record<string, string>): TechValues {
  const out: TechValues = {};
  for (const f of [...techFieldsFor(category), ...CONDITION_FIELDS]) {
    const v = (raw[f.key] ?? '').trim();
    if (!v) continue;
    if (f.type === 'number') {
      const n = Number(v.replace(',', '.'));
      if (Number.isFinite(n) && n >= 0 && n < 1e7) out[f.key] = Math.round(n * 100) / 100;
    } else out[f.key] = v.slice(0, 60);
  }
  return out;
}

export const formatTech = (f: TechField, v: string | number | undefined | null) =>
  v === undefined || v === null || v === '' ? null : `${typeof v === 'number' ? v.toLocaleString('tr-TR') : v}${f.unit ? ` ${f.unit}` : ''}`;

/** Arama filtresi: sayısal alanlarda {min,max}, seçmeli alanlarda metin. */
export type TechFilter = Record<string, { min?: string; max?: string } | string>;
/** Filtrede gösterilecek alanlar (kategori veya "group:<id>" kategori grubu). */
export const filterFieldsFor = (category: string): TechField[] =>
  (category.startsWith('group:') ? TECH_BY_GROUP[category.slice(6)] ?? [] : techFieldsFor(category)).filter((f) => f.filter);

/** Yalnızca seçili kategoriye ait alanlar gönderilir (başka kategoriden kalan filtre sonuçları boşaltmasın). */
export function techFilterParams(t: TechFilter | undefined, category?: string): Record<string, unknown> | undefined {
  if (!t) return undefined;
  const allowed = category !== undefined ? new Set(filterFieldsFor(category).map((f) => f.key)) : null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    if (allowed && !allowed.has(k)) continue;
    if (typeof v === 'string') { if (v) out[k] = v; continue; }
    const min = v.min ? Number(v.min.replace(',', '.')) : null;
    const max = v.max ? Number(v.max.replace(',', '.')) : null;
    if ((min != null && Number.isFinite(min)) || (max != null && Number.isFinite(max))) out[k] = { ...(min != null && Number.isFinite(min) ? { min } : {}), ...(max != null && Number.isFinite(max) ? { max } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
}
export const techFilterCount = (t: TechFilter | undefined, category?: string) => Object.keys(techFilterParams(t, category) ?? {}).length;
