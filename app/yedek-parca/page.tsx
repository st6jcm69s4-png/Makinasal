import { pageMetadata } from '@/lib/seo';
import { SparePartsBrowser } from "@/components/SparePartsBrowser";
export const metadata = pageMetadata('/yedek-parca', 'Yedek parça', 'Makinasal · Yedek parça. İş makinesi ve kamyon pazarı.', false);
export default function Page(){return <SparePartsBrowser/>;}
