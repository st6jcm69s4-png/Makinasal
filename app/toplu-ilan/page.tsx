import {BulkImportView} from '@/components/BulkImportView';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('/toplu-ilan','Toplu ilan aktarımı','Şirketler için CSV ve XML ilan taslakları.',true);
export default function Page(){return <BulkImportView/>;}
