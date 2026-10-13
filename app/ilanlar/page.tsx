import { ListingBrowser } from '@/components/ListingBrowser';
import { LISTINGS } from '@/lib/data/listings';
import { SELLERS } from '@/lib/data/sellers';

export const metadata = { title: 'İlanlar | Makinasal' };

export default function ListingsPage() {
  return (
    <>
      <h1>İlanlar</h1>
      <p className="sub">İş makineleri, kamyonlar, yedek parça ve lastik. Şu an gösterilenler demo verisidir.</p>
      <ListingBrowser listings={LISTINGS} sellers={SELLERS} />
    </>
  );
}
