import { StoreView } from '@/components/StoreView';

export const metadata = { title: 'Satıcı | Makinasal' };

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoreView id={id} />;
}
