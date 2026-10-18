import type { Metadata } from 'next';
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://makinasal-alperen.prettypetal16.chatgpt.site').replace(/\/$/,'');
// Keep private beta out of search indexes. Enable only after public launch.
export const PUBLIC_INDEXING = process.env.PUBLIC_INDEXING_ENABLED === 'true';
export const publicPages = [
 ['/', 'Makinasal', 'Satılık ve kiralık iş makineleri, kamyonlar ve yedek parçalar.'],
 ['/ilanlar','İlanlarda ara','İş makinesi ve kamyon ilanlarını kategori, marka, şehir ve fiyatla filtrele.'],
 ['/kiralik','Kiralık','Kiralık iş makineleri, kamyonlar ve operatör hizmetleri.'],
 ['/yedek-parca','Yedek parça','Makine, kamyon, parça grubu ve parça numarasıyla yedek parça ara.'],
 ['/isler','İş ilanları','İş makinesi operatörü, şoför ve usta iş ilanları.'],
 ['/sirketler','Şirketler ve filolar','Bölgenizdeki iş makinesi ve hafriyat firmalarını keşfet.'],
 ['/is-ve-hizmetler','İş ve hizmetler','İş bul, hizmet al ve firma keşfet.'],
 ['/parca-talepleri','Parça talepleri','Aranan iş makinesi ve kamyon parçaları.'],
 ['/destek','Yardım merkezi','Makinasal kullanım ve hesap desteği.'],
 ['/guven','Güvenli alışveriş','İlan ve görüşmelerde güvenli alışveriş rehberi.'],
 ['/hukuki','Hukuki bilgiler','Gizlilik, kullanım koşulları ve çerez tercihleri.'],
] as const;
export function pageMetadata(path:string,title:string,description:string,privatePage=false): Metadata {
 const entry=publicPages.find(x=>x[0]===path);if(entry){title=entry[1];description=entry[2];}
 return {title,description,alternates:{canonical:path},robots:{index:PUBLIC_INDEXING&&!privatePage,follow:!privatePage},openGraph:{title,description,url:SITE_ORIGIN+path,siteName:'Makinasal',locale:'tr_TR',type:'website'},twitter:{card:'summary',title,description}};
}
export const jsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export const xmlEscape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
