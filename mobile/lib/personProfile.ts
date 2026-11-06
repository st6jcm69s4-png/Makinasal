// "Kendini tanıt" eleman profili: market_posts.details içinde saklanan yapı ve yardımcılar.
export const CERTS = [
  'İş makinesi operatör belgesi', 'MYK mesleki yeterlilik belgesi', 'SRC belgesi', 'Psikoteknik belgesi',
  'İSG eğitim belgesi', 'Vinç operatörlüğü belgesi', 'Forklift operatör belgesi', 'Kaynakçı belgesi',
] as const;
export const LICENSES = ['B', 'C', 'CE', 'D', 'F', 'G'] as const;
export const WORK_TYPES = ['Günlük', 'Proje bazlı', 'Aylık / kadrolu'] as const;
export const AVAILABILITY = { now: 'Hemen başlayabilirim', date: 'Belirli bir tarihten itibaren', weekend: 'Hafta sonları' } as const;
export type Availability = keyof typeof AVAILABILITY;

export type HistoryItem = { place: string; role: string; period: string };
export type PersonDetails = {
  v: 1;
  machines: string[];
  brands: string;
  years: number;
  certs: string[];
  licenses: string[];
  history: HistoryItem[];
  workTypes: string[];
  availability: Availability;
  travel: boolean;
  birthYear: number | null;
};

export function isPersonDetails(x: unknown): x is PersonDetails {
  return !!x && typeof x === 'object' && (x as { v?: number }).v === 1 && Array.isArray((x as PersonDetails).machines);
}

/** Web ve eski istemciler için düz metin özeti (specs alanına yazılır, en fazla 1000 karakter). */
export function personSummary(d: PersonDetails): string {
  const parts = [
    d.machines.length ? `Kullanabildiği makineler: ${d.machines.join(', ')}` : '',
    d.brands.trim() ? `Markalar: ${d.brands.trim()}` : '',
    `Deneyim: ${d.years} yıl`,
    d.certs.length ? `Belgeler: ${d.certs.join(', ')}` : '',
    d.licenses.length ? `Ehliyet: ${d.licenses.join(', ')}` : '',
    d.workTypes.length ? `Çalışma şekli: ${d.workTypes.join(', ')}` : '',
    `Müsaitlik: ${AVAILABILITY[d.availability]}`,
    d.travel ? 'Şehir dışına çıkabilir' : '',
    d.history.length ? `Geçmiş işler: ${d.history.map((h) => [h.place, h.role, h.period].filter(Boolean).join(' – ')).join('; ')}` : '',
  ].filter(Boolean);
  return parts.join('. ').slice(0, 1000);
}
