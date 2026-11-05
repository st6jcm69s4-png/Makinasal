// Premium tarifeleri. Fiyatlar TL; yıllık ödeme 10 aylık ücrete denk gelir (2 ay bedava).
export type PlanId = 'pro' | 'business';
export type Period = 'monthly' | 'yearly';
export type Plan = { id: PlanId; name: string; tagline: string; monthly: number; yearly: number; aiLimit: number; listings: number; features: string[] };

export const YEARLY_DISCOUNT = 0.15;
export const FREE = { listings: 3, photos: 8 };

export const PLANS: Plan[] = [
  {
    id: 'pro', name: 'Pro', monthly: 69.99, yearly: 699.99, aiLimit: 40, listings: 30,
    tagline: 'Bireysel satıcılar, operatörler ve ustalar için',
    features: [
      'Yapay zeka iş asistanı (ayda 40 soru)',
      'İlanların ve iş ağı ilanların üst sıralarda',
      '30 ilan hakkı, ilan başına 20 fotoğraf',
      'Reklamsız kullanım',
    ],
  },
  {
    id: 'business', name: 'Firma Pro', monthly: 179.99, yearly: 1799.99, aiLimit: 200, listings: 100,
    tagline: 'Şirketler, filolar ve bayiler için',
    features: [
      'Pro tarifesindeki her şey',
      'Yapay zeka iş asistanı (ayda 200 soru)',
      'Firma profilin, iş, kiralama ve eleman ilanların en üstte',
      'Satış ilanların aramalarda en üstte',
      '100 ilan hakkı, ilan başına 20 fotoğraf',
    ],
  },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Yıllık toplam (sabit, sonu 99 kuruş). */
export const yearlyTotal = (p: Plan) => p.yearly;
/** Yıllıkta aylık ödemeye göre indirim yüzdesi. */
export const yearlyDiscountPct = (p: Plan) => Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
/** Yıllık ödemede aylığa düşen tutar. */
export const yearlyPerMonth = (p: Plan) => round2(yearlyTotal(p) / 12);

export function money(n: number, lang: 'tr' | 'en' | 'de') {
  const locale = lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'tr-TR';
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n.toFixed(2).replace('.', ',')} ₺`; }
}

/** Profilden etkin tarifeyi çıkarır (süresi dolmuşsa null). */
export function activePlan(p: { is_premium?: boolean | null; premium_plan?: string | null; premium_until?: string | null } | null): PlanId | null {
  if (!p?.is_premium) return null;
  if (p.premium_until && new Date(p.premium_until).getTime() < Date.now()) return null;
  return p.premium_plan === 'business' ? 'business' : 'pro';
}
