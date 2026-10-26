// Web uygulamasındaki lib/trust.ts ile aynı kural.
export type TrustLevel = { label: 'Riskli' | 'Yeni üye' | 'Çok güvenilir' | 'Güvenilir' | 'Orta güven'; color: string };
export function trustLevel(m: { rep: number; deals: number; s: number | null }): TrustLevel {
  if (m.rep >= 2 || (m.deals >= 3 && m.s != null && m.s < 3)) return { label: 'Riskli', color: '#b00020' };
  if (m.deals < 3 || m.s == null) return { label: 'Yeni üye', color: '#666' };
  if (m.s >= 4.5 && m.deals >= 10) return { label: 'Çok güvenilir', color: '#1b7f3b' };
  if (m.s >= 4) return { label: 'Güvenilir', color: '#1b7f3b' };
  return { label: 'Orta güven', color: '#b36b00' };
}
