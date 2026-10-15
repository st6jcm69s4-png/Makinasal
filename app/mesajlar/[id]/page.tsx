import { MessagesView } from '@/components/MessagesView';

export const metadata = { title: 'Konuşma | Makinasal' };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MessagesView activeId={id} />;
}
