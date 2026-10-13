import type { Seller } from './data/types';

export type TrustLevel = {
  label: 'Riskli' | 'Yeni üye' | 'Çok güvenilir' | 'Güvenilir' | 'Orta güven';
  tone: 'bad' | 'neutral' | 'good' | 'warn';
};

/**
 * Güven seviyesi (DEVIR-NOTU kuralı):
 * rep>=2 veya (anlaşma>=3 ve puan<3) → Riskli; anlaşma<3 veya puansız → Yeni üye;
 * puan>=4.5 ve anlaşma>=10 → Çok güvenilir; puan>=4 → Güvenilir; diğer → Orta güven.
 */
export function trustLevel(m: Pick<Seller, 'rep' | 'deals' | 's'>): TrustLevel {
  if (m.rep >= 2 || (m.deals >= 3 && m.s != null && m.s < 3)) return { label: 'Riskli', tone: 'bad' };
  if (m.deals < 3 || m.s == null) return { label: 'Yeni üye', tone: 'neutral' };
  if (m.s >= 4.5 && m.deals >= 10) return { label: 'Çok güvenilir', tone: 'good' };
  if (m.s >= 4) return { label: 'Güvenilir', tone: 'good' };
  return { label: 'Orta güven', tone: 'warn' };
}
