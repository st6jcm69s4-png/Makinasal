import { pageMetadata } from '@/lib/seo';
import { ModerationView } from '@/components/ModerationView';
export const metadata = pageMetadata('/yonetim', 'Yönetim', 'Makinasal · Yönetim. İş makinesi ve kamyon pazarı.', true);
export default function AdminPage() { return <ModerationView />; }
