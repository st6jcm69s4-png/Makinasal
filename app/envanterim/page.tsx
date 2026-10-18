import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/envanterim', 'Şirketim ve envanterim', 'Şirketim ve envanterim · Makinasal.', true);
import {CompanyInventory} from '@/components/CompanyInventory';
export default function Page(){return <CompanyInventory manage/>;}
