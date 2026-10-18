import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('/mesajlar/[id]','Mesajlar','Makinasal · Mesajlar.',true);
import { MessagesView } from '@/components/MessagesView';



export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MessagesView activeId={id} />;
}
