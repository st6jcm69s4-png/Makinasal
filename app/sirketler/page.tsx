import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('/sirketler','Şirketler ve filolar','Bölgenizdeki iş makinesi ve hafriyat firmalarını keşfet.');
import {ProviderDirectory} from '@/components/NetworkHub';
export default function Page(){return <ProviderDirectory companyOnly/>;}
