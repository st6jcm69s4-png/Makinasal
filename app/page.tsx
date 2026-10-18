import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/', 'Makinasal', 'Makinasal · Makinasal. İş makinesi ve kamyon pazarı.', false);
import { HomeView } from '@/components/HomeView';

export default function Home() {
  return <HomeView />;
}
