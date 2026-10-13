import Link from 'next/link';
import type { Listing, Seller } from '@/lib/data/types';
import { formatTL } from '@/lib/format';
import { listingTitle, usageLabel } from '@/lib/listing';
import { TrustBadge } from './TrustBadge';

export function ListingCard({ l, seller }: { l: Listing; seller: Seller }) {
  const usage = usageLabel(l);
  return (
    <Link href={`/ilanlar/${l.id}`} className="card">
      <div className="ph">Fotoğraf yok (demo)</div>
      <div className="body">
        <div className="cat">{l.cat}</div>
        <div className="title">{listingTitle(l)}</div>
        <div>
          <span className="price">{formatTL(l.price)}</span>
          {l.prev && l.prev > l.price ? <span className="prev">{formatTL(l.prev)}</span> : null}
        </div>
        <div className="meta">
          {[l.year, usage, l.city].filter(Boolean).join(' · ')}
        </div>
        <div className="meta">
          {seller.name} <TrustBadge seller={seller} />
        </div>
      </div>
    </Link>
  );
}
