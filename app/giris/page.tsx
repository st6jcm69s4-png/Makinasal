import { pageMetadata } from '@/lib/seo';
import { Text } from "@/components/LanguageProvider";
import { AuthForm } from '@/components/AuthForm';

export const metadata = pageMetadata('/giris', 'Giriş', 'Makinasal · Giriş. İş makinesi ve kamyon pazarı.', true);

export default function LoginPage() {
  return (
    <>
      <h1><Text value={"Giriş / Kayıt"} /></h1>
      <p className="sub"><Text value={"E-posta ve şifre ile giriş yap. Telefon doğrulaması (SMS) sonraki aşamada eklenecek."} /></p>
      <AuthForm />
    </>
  );
}
