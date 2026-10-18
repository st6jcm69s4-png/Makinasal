import { pageMetadata } from '@/lib/seo';
import { PremiumView } from '@/components/PremiumView';

export const metadata = pageMetadata('/premium', 'Premium', 'Makinasal · Premium. İş makinesi ve kamyon pazarı.', true);

export default function PremiumPage() {
  return <PremiumView />;
}
