import { trustLevel } from '@/lib/trust';
import type { Seller } from '@/lib/data/types';

const CLASS = { bad: 'bad', neutral: '', good: 'good', warn: 'warn' } as const;

export function TrustBadge({ seller }: { seller: Pick<Seller, 'rep' | 'deals' | 's'> }) {
  const t = trustLevel(seller);
  return <span className={`badge ${CLASS[t.tone]}`}>{t.label}</span>;
}
