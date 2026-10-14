import { Chat } from '@/components/Chat';

export const metadata = { title: 'Konuşma | Makinasal' };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Chat threadId={id} />;
}
