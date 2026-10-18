import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/ilanlarim', 'İlanlarım', 'İlanlarım · Makinasal.', true);
import { redirect } from 'next/navigation';

export default function MyListingsPage() {
  redirect('/profil');
}
