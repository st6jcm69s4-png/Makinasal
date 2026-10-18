import { pageMetadata } from '@/lib/seo';
import { PaymentsView } from "@/components/PaymentsView";
export const metadata = pageMetadata('/odemeler', 'Ödemelerim', 'Makinasal · Ödemelerim. İş makinesi ve kamyon pazarı.', true);
export default function Page(){return <PaymentsView/>;}
