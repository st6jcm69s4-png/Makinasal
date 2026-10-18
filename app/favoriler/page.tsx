import { pageMetadata } from '@/lib/seo';
import { FavoritesView } from '@/components/FavoritesView';

export const metadata = pageMetadata('/favoriler', 'Favoriler', 'Makinasal · Favoriler. İş makinesi ve kamyon pazarı.', true);

export default function FavoritesPage() {
  return <FavoritesView />;
}
