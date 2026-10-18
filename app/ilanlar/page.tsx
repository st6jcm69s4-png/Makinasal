import { pageMetadata } from '@/lib/seo';
import { ListingBrowser } from '@/components/ListingBrowser';

export const metadata = pageMetadata('/ilanlar', 'İlanlarda ara', 'Makinasal · İlanlarda ara. İş makinesi ve kamyon pazarı.', false);

export default function ListingsPage() {
  return <ListingBrowser />;
}
