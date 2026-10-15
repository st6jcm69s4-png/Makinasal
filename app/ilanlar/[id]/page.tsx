import { ListingDetail } from '@/components/ListingDetail';

export const metadata = { title: 'İlan | Makinasal' };

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
