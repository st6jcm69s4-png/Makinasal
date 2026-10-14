import Link from 'next/link';
import type { Listing, Seller } from '@/lib/data/types';
import { formatTL } from '@/lib/format';
import { listingTitle, usageLabel } from '@/lib/listing';
import { TrustBadge } from './TrustBadge';

export function ListingCard({ l, seller }: { l: Listing; seller: Seller }) {
  const usage = usageLabel(l);
  return (
    <Link href={`/ilanlar/${l.id}`} className="card">
      {l.photos && l.photos.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ph" src={l.photos[0]} alt={listingTitle(l)} loading="lazy" style={{ width: '100%', objectFit: 'cover' }} />
      ) : (
        <div className="ph">Fotoğraf yok</div>
      )}
      <div className="body">
        <div className="cat">{l.cat}{l.demo ? <span className="badge" style={{ marginLeft: 6 }}>Demo</span> : null}</div>
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
