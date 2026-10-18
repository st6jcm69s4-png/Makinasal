import { pageMetadata } from '@/lib/seo';
import { AccountVerification } from "@/components/AccountVerification";
export const metadata = pageMetadata('/hesap-dogrula', 'Hesap doğrulama', 'Makinasal · Hesap doğrulama. İş makinesi ve kamyon pazarı.', true);
export default function Page(){return <AccountVerification/>;}
