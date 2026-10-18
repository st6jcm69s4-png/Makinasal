import { pageMetadata } from '@/lib/seo';
import { PasswordResetForm } from '@/components/PasswordResetForm';
export const metadata = pageMetadata('/sifre-yenile', 'Şifre yenile', 'Makinasal · Şifre yenile. İş makinesi ve kamyon pazarı.', true);
export default function PasswordResetPage() { return <PasswordResetForm />; }
