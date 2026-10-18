import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';
import { serverListing } from '@/lib/serverListing';
import { cardTitle } from '@/lib/listing';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { id } = await params; const data = await serverListing(id);
 if (!data) return { title: 'İlan | Makinasal', robots: { index: false } };
 const title = `${cardTitle(data.listing)} | Makinasal`;
 const description = `${data.listing.city} · ${data.listing.cat}. ${data.listing.desc ?? ''}`.slice(0,160);
 return { title, description, alternates: { canonical: `/ilanlar/${id}` }, openGraph: { title, description, images: data.listing.photos?.slice(0,1) } };
}
export default async function ListingPage({ params }: Props) {
 const { id } = await params; const data = await serverListing(id);
 if (!data && !/^[0-9a-f-]{36}$/i.test(id) && !(process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && /^\d+$/.test(id))) notFound();
 const ld = data ? { '@context': 'https://schema.org', '@type': 'Product', name: cardTitle(data.listing), description: (data.listing.desc ?? '').slice(0, 300), image: data.listing.photos?.slice(0, 4), url: `${SITE_URL}/ilanlar/${id}`, offers: { '@type': 'Offer', priceCurrency: 'TRY', price: data.listing.price, availability: data.listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url: `${SITE_URL}/ilanlar/${id}` } } : null;
 return <>{ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}<ListingDetail id={id} initial={data} /></>;
}
