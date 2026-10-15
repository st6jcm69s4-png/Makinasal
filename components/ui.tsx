import type { ReactNode } from 'react';
import type { Seller } from '@/lib/data/types';
import { formatScore } from '@/lib/format';
import { trustLevel } from '@/lib/trust';

export const toneClass = (t: 'bad' | 'neutral' | 'good' | 'warn') => (t === 'neutral' ? '' : t);

export function Pill({ cls = '', children }: { cls?: string; children: ReactNode }) {
  return <span className={`pill ${cls}`.trim()}>{children}</span>;
}

export function TrustPill({ seller }: { seller: Pick<Seller, 'rep' | 'deals' | 's'> }) {
  const t = trustLevel(seller);
  return <Pill cls={toneClass(t.tone)}>{t.label}</Pill>;
}

export function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} yıldız`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export function ScoreRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="score">
      <span className="out" style={{ width: 110 }}>{label}</span>
      <div className="meter"><i style={{ width: `${((value ?? 0) / 5) * 100}%` }} /></div>
      <span className="out">{formatScore(value)}</span>
    </div>
  );
}

export const IconFav = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
);
export const IconCmp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4" /></svg>
);

export function Avatar({ name, small }: { name: string; small?: boolean }) {
  return <div className={`avatar${small ? ' sm' : ''}`} aria-hidden="true">{(name || 'S').charAt(0).toLocaleUpperCase('tr')}</div>;
}
