import { pageMetadata, jsonLd, SITE_ORIGIN } from '@/lib/seo';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';
import { serverListing } from '@/lib/serverListing';
import { cardTitle } from '@/lib/listing';

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { id } = await params; const data = await serverListing(id);
 if (!data) return { title: 'İlan | Makinasal', robots: { index: false } };
 const title = cardTitle(data.listing);
 const description = `${data.listing.city} · ${data.listing.cat}. ${data.listing.desc ?? ''}`.slice(0,160);
 return { ...pageMetadata('/ilanlar/'+id,title,description,data.listing.status!=='active'),openGraph:{title,description,url:SITE_ORIGIN+'/ilanlar/'+id,images:data.listing.photos?.slice(0,1)} };
}
export default async function ListingPage({ params }: Props) {
 const { id } = await params; const data = await serverListing(id);
 if (!data && !/^[0-9a-f-]{36}$/i.test(id) && !(process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && /^\d+$/.test(id))) notFound();
 if(!data && process.env.NEXT_PUBLIC_DEMO_MODE!=='true')notFound();
 const l=data?.listing;
 const structured=l&&l.status==='active'?{'@context':'https://schema.org','@type':'Product',name:cardTitle(l),description:l.desc||cardTitle(l),image:l.photos?.length?l.photos:undefined,brand:l.brand?{'@type':'Brand',name:l.brand}:undefined,offers:{'@type':'Offer',url:SITE_ORIGIN+'/ilanlar/'+id,price:l.price,priceCurrency:'TRY',availability:'https://schema.org/InStock'}}:null;
 return <>{structured?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>:null}<ListingDetail id={id} initial={data} /></>;
}
