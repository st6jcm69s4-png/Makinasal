import {pageMetadata} from '@/lib/seo';
import {getServerSupabase} from '@/lib/supabase/server';
import {loadSellers} from '@/lib/dbListings';
import { StoreView } from '@/components/StoreView';

export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return pageMetadata('/magaza/'+id,'Satıcı','Makinasal satıcı profili.',true);const db=getServerSupabase();const sellers=db?await loadSellers(db,[id]):{};const seller=sellers[id];return pageMetadata('/magaza/'+id,seller?.name||'Satıcı',seller?`${seller.name} · ${seller.city}. İş makinesi ve kamyon ilanları.`:'Makinasal satıcı profili.',!seller);}

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoreView id={id} />;
}
