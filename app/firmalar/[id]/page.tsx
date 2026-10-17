import { ProviderDetail } from '@/components/NetworkHub';
export default async function Page({ params }: { params: Promise<{id:string}> }) { const {id}=await params;return <ProviderDetail id={id}/>; }
