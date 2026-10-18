import { pageMetadata } from '@/lib/seo';
import { MessagesView } from '@/components/MessagesView';

export const metadata = pageMetadata('/mesajlar', 'Mesajlar', 'Makinasal · Mesajlar. İş makinesi ve kamyon pazarı.', true);

export default function MessagesPage() {
  return <MessagesView />;
}
