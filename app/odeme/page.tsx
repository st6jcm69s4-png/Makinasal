import { pageMetadata } from '@/lib/seo';
import { CheckoutView } from "@/components/PaymentsView";
export const metadata = pageMetadata('/odeme', 'Güvenli ödeme', 'Makinasal · Güvenli ödeme. İş makinesi ve kamyon pazarı.', true);
export default function Page(){return <CheckoutView/>;}
