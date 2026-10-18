import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/is-agi/yeni', 'Yeni iş ve hizmet ilanı', 'Yeni iş ve hizmet ilanı · Makinasal.', true);
import { PostEditor } from '@/components/NetworkHub';
export default function Page() { return <PostEditor/>; }
