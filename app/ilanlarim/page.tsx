import { MyListings } from '@/components/MyListings';

export const metadata = { title: 'İlanlarım | Makinasal' };

export default function MyListingsPage() {
  return (
    <>
      <h1>İlanlarım</h1>
      <MyListings />
    </>
  );
}
