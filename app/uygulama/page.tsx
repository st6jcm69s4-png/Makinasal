import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/uygulama', 'Uygulama', 'Uygulama · Makinasal.', true);
import { redirect } from 'next/navigation';
export default function AppPage() { redirect('/'); }
