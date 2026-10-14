import { ListingForm } from '@/components/ListingForm';

export const metadata = { title: 'İlan ver | Makinasal' };

export default function NewListingPage() {
  return (
    <>
      <h1>İlan ver</h1>
      <p className="sub">Ücretsiz üyelikte 3 ilan ve ilan başına 8 fotoğraf hakkın var.</p>
      <ListingForm />
    </>
  );
}
