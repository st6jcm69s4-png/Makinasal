import { pageMetadata } from '@/lib/seo';
import { Text } from "@/components/LanguageProvider";
import { ListingForm } from '@/components/ListingForm';

export const metadata = pageMetadata('/ilan-ver', 'İlan ver', 'Makinasal · İlan ver. İş makinesi ve kamyon pazarı.', true);

export default function NewListingPage() {
  return (
    <>
      <h1><Text value={"İlan ver"} /></h1>
      <p className="lead"><Text value={"Kurucu döneminde ilan ücreti yok. Fiyatın piyasa ortalamasından çok uzak olup olmadığını form sırasında görürsün."} /></p>
      <ListingForm />
    </>
  );
}
