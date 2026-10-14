import { ListingBrowser } from '@/components/ListingBrowser';
import { LISTINGS } from '@/lib/data/listings';
import { SELLERS } from '@/lib/data/sellers';
import { fetchActiveListings } from '@/lib/dbListings';
import { getServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'İlanlar | Makinasal' };
export const dynamic = 'force-dynamic';

export default async function ListingsPage() {
  const db = await fetchActiveListings(getServerSupabase());
  const demo = LISTINGS.map((l) => ({ ...l, demo: true }));
  return (
    <>
      <h1>İlanlar</h1>
      <p className="sub">
        {db.listings.length} gerçek ilan, ayrıca örnek olarak {demo.length} demo ilan gösteriliyor.
      </p>
      <ListingBrowser listings={[...db.listings, ...demo]} sellers={{ ...SELLERS, ...db.sellers }} />
    </>
  );
}
