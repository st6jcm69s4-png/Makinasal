import {pageMetadata} from '@/lib/seo';
import {Text} from '@/components/LanguageProvider';
export const metadata=pageMetadata('/hukuki','Hukuki bilgiler','Gizlilik, kullanım koşulları ve çerez tercihleri.');
export default function Page(){return <><h1><Text value="Hukuki bilgiler"/></h1><div className="panel"><nav className="acts-row"><a href="/hukuki/kvkk"><Text value="KVKK aydınlatma"/></a><a href="/hukuki/kullanim"><Text value="Kullanım koşulları"/></a><a href="/hukuki/cerez"><Text value="Çerez politikası"/></a><a href="/hukuki/satis"><Text value="Satış ve ödeme bilgileri"/></a><a href="/hukuki/ilan-kurallari"><Text value="İlan yayınlama kuralları"/></a></nav></div></>;}
