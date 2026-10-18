import { pageMetadata } from '@/lib/seo';
import { NetworkBrowse } from "@/components/NetworkHub";
export const metadata = pageMetadata('/kiralik', 'Kiralık makine, kamyon, operatör ve ustalar', 'Makinasal · Kiralık makine, kamyon, operatör ve ustalar. İş makinesi ve kamyon pazarı.', false);
export default function Page() { return <NetworkBrowse rentalHub />; }
