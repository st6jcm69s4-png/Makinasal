import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/is-agi/hesabim', 'İşlerim ve tekliflerim', 'İşlerim ve tekliflerim · Makinasal.', true);
import { NetworkAccount } from '@/components/NetworkHub';
export default function Page() { return <NetworkAccount/>; }
