import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/isler', 'Makinasal', 'Makinasal · Makinasal. İş makinesi ve kamyon pazarı.', false);
import { NetworkBrowse } from '@/components/NetworkHub';
export default function Page() { return <NetworkBrowse kind="job"/>; }
