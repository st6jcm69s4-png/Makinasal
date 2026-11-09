import { Redirect } from 'expo-router';

/** Alt menüdeki ortadaki "İlan ver" düğmesi bu sekmeyi açmaz, ilan formuna gider. Doğrudan açılırsa yönlendirir. */
export default function NewListingTab() {
  return <Redirect href="/ilan-ver" />;
}
