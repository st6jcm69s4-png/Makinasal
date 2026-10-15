import { ListingForm } from '@/components/ListingForm';

export const metadata = { title: 'İlan ver | Makinasal' };

export default function NewListingPage() {
  return (
    <>
      <h1>İlan ver</h1>
      <p className="lead">Kurucu döneminde ilan ücreti yok. Fiyatın piyasa ortalamasından çok uzak olup olmadığını form sırasında görürsün.</p>
      <ListingForm />
    </>
  );
}
