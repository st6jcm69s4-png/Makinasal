import { pageMetadata } from '@/lib/seo';
import { ProfileView } from '@/components/ProfileView';

export const metadata = pageMetadata('/profil', 'Profil', 'Makinasal · Profil. İş makinesi ve kamyon pazarı.', true);

export default function ProfilePage() {
  return <ProfileView />;
}
