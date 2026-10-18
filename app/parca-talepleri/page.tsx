import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/parca-talepleri', 'Makinasal', 'Makinasal · Makinasal. İş makinesi ve kamyon pazarı.', false);
import { NetworkBrowse } from '@/components/NetworkHub';
export default function Page() { return <NetworkBrowse kind="part_request"/>; }
