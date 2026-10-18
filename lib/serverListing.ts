import { cache } from 'react';
import { fetchListingById } from './dbListings';
import { getRequestSupabase } from './supabase/server';
export const serverListing = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return fetchListingById(await getRequestSupabase(), id);
});
