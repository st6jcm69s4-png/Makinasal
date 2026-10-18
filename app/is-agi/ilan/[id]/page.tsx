import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('/is-agi/ilan/[id]','İş ve hizmet ilanı','Makinasal · İş ve hizmet ilanı.',true);
import { PostDetail } from '@/components/NetworkHub';
export default async function Page({ params }: { params: Promise<{id:string}> }) { const {id}=await params;return <PostDetail id={id}/>; }
