import { pageMetadata } from '@/lib/seo';
import { CompareView } from '@/components/CompareView';

export const metadata = pageMetadata('/karsilastir', 'Karşılaştır', 'Makinasal · Karşılaştır. İş makinesi ve kamyon pazarı.', true);

export default function ComparePage() {
  return <CompareView />;
}
