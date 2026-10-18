import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/firma-kaydi', 'Firma kaydı', 'Firma kaydı · Makinasal.', true);
import { ProviderEditor } from '@/components/NetworkHub';
export default function Page() { return <ProviderEditor/>; }
