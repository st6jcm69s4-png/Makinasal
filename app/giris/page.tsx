import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Giriş | Makinasal' };

export default function LoginPage() {
  return (
    <>
      <h1>Giriş / Kayıt</h1>
      <p className="sub">E-posta ve şifre ile giriş yap. Telefon doğrulaması (SMS) sonraki aşamada eklenecek.</p>
      <AuthForm />
    </>
  );
}
