import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactSeller } from '@/components/ContactSeller';
import { TrustBadge } from '@/components/TrustBadge';
import { LISTINGS } from '@/lib/data/listings';
import { SELLERS } from '@/lib/data/sellers';
import { formatScore, formatTL } from '@/lib/format';
import { distanceLabel } from '@/lib/geo';
import { fetchActiveListings, fetchListingById } from '@/lib/dbListings';
import { getListing, listingTitle, usageLabel } from '@/lib/listing';
import { getServerSupabase } from '@/lib/supabase/server';
import { categoryMedian, isPartCategory, priceFlag } from '@/lib/pricing';

const MY_CITY = 'İstanbul'; // demo: giriş yapan kullanıcının şehri

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerSupabase();
  const db = await fetchActiveListings(supabase);
  const pool = [...LISTINGS, ...db.listings];
  let l = null as ReturnType<typeof getListing>;
  let seller = null as (typeof SELLERS)[string] | null;
  if (/^\d+$/.test(id)) {
    l = getListing(LISTINGS, Number(id));
    seller = l ? SELLERS[l.sel] : null;
  } else {
    const one = await fetchListingById(supabase, id);
    l = one?.listing ?? null;
    seller = one?.seller ?? null;
  }
  if (!l || !seller) {
    notFound();
    return null;
  }
  const flag = priceFlag(pool, l.price, l.cat);
  const median = categoryMedian(pool, l.cat);
  const part = isPartCategory(l.cat);
  const usage = usageLabel(l);

  const rows: [string, string | number | undefined][] = [
    ['Kategori', l.cat],
    ['Marka', l.brand],
    ['Model', l.model],
    ['Yıl', l.year],
    [part ? 'Parça / ebat no' : 'Kullanım', part ? (l.spec as string | undefined) : usage],
    ['Durum', l.cond as string | undefined],
    ['Uyumlu', l.compat as string | undefined],
    ['Adet', l.qty as number | undefined],
    ['Şehir', l.city],
    ['Mesafe', distanceLabel(MY_CITY, l.city) || undefined],
    ['Seri no beyanı', part ? undefined : l.serial ? 'Var' : 'Yok'],
    ['Takas', l.takas ? 'Olur' : 'Olmaz'],
  ];

  return (
    <>
      <Link href="/ilanlar" className="back">← İlanlara dön</Link>
      <h1>{listingTitle(l)}</h1>
      <div className="detail">
        <div>
          <div className="panel">
            {l.photos && l.photos.length > 0 ? (
              <div className="gallery">
                {l.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt={`${listingTitle(l)} fotoğraf ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
                ))}
              </div>
            ) : (
              <div className="ph" style={{ height: 220, borderRadius: 10 }}>Fotoğraf yok</div>
            )}
            {l.status && l.status !== 'active' ? (
              <div className="alert high">Bu ilan {l.status === 'sold' ? 'satıldı' : 'şu an yayında değil'}.</div>
            ) : null}
            <p>
              <span className="price" style={{ fontSize: 26 }}>{formatTL(l.price)}</span>
              {l.prev && l.prev > l.price ? <span className="prev">{formatTL(l.prev)}</span> : null}
            </p>
            {flag === 'low' && median ? (
              <div className="alert low">
                <b>Dikkat:</b> Bu fiyat kategori ortalamasının ({formatTL(median)}) çok altında. Ürünü görmeden kapora veya ön ödeme gönderme.
              </div>
            ) : null}
            {flag === 'high' && median ? (
              <div className="alert high">Bu fiyat kategori ortalamasının ({formatTL(median)}) belirgin üstünde.</div>
            ) : null}
            <p>{l.desc}</p>
            <h2>Özellikler</h2>
            <table className="specs">
              <tbody>
                {rows.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="panel">
          <h2>Satıcı</h2>
          <p style={{ margin: '0 0 6px' }}><b>{seller.name}</b> {seller.ver ? '✓' : ''}</p>
          <p style={{ margin: '0 0 10px' }}><TrustBadge seller={seller} /> <span className="meta">{seller.type} · {seller.city} · {seller.since}'den beri</span></p>
          <p className="meta">
            Puan: <span className="stars">★</span> {formatScore(seller.s)} · {seller.deals} onaylı anlaşma
            {seller.rep > 0 ? ` · ${seller.rep} şikayet` : ''}
          </p>
          {seller.reviews.slice(0, 2).map((r, i) => (
            <p key={i} className="meta">“{r.text}” — {r.who}</p>
          ))}
          {typeof l.id === 'string' ? (
            <ContactSeller listingId={l.id} sellerId={l.sel} />
          ) : (
            <p className="meta">Bu bir demo ilandır; mesajlaşma yalnızca gerçek ilanlarda çalışır.</p>
          )}
        </aside>
      </div>
    </>
  );
}
