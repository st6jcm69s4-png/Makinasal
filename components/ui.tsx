"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { ReactNode } from 'react';
import type { Seller } from '@/lib/data/types';
import { formatScore } from '@/lib/format';
import { trustLevel } from '@/lib/trust';

export const toneClass = (t: 'bad' | 'neutral' | 'good' | 'warn') => (t === 'neutral' ? '' : t);

export function Pill({ cls = '', children }: { cls?: string; children: ReactNode }) {
  const { t: tr, language } = useLanguage();

  return <span className={`pill ${cls}`.trim()}>{children}</span>;
}

export function TrustPill({ seller }: { seller: Pick<Seller, 'rep' | 'deals' | 's'> }) {
  const { t: tr, language } = useLanguage();

  const t = trustLevel(seller);
  return <Pill cls={toneClass(t.tone)}>{tr(t.label)}</Pill>;
}

export function Stars({ n }: { n: number }) {
  const { t: tr, language } = useLanguage();

  return <span aria-label={tr("{0} yıldız", {"0":n})}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export function ScoreRow({ label, value }: { label: string; value: number | null | undefined }) {
  const { t: tr, language } = useLanguage();

  return (
    <div className="score">
      <span className="out" style={{ width: 110 }}>{tr(label)}</span>
      <div className="meter"><i style={{ width: `${((value ?? 0) / 5) * 100}%` }} /></div>
      <span className="out">{formatScore(value, language)}</span>
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
  const { t: tr, language } = useLanguage();

  return <div className={`avatar${small ? ' sm' : ''}`} aria-hidden="true">{(name || 'S').charAt(0).toLocaleUpperCase('tr')}</div>;
}
