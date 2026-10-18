import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/operatorler', 'Makinasal', 'Makinasal · Makinasal. İş makinesi ve kamyon pazarı.', false);
import { redirect } from "next/navigation";
export default function Page() { redirect("/kiralik?bolum=personel"); }
