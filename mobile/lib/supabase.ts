import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? '';
export const configured = !!SUPABASE_URL && !!KEY;

export const supabase = createClient(SUPABASE_URL || 'http://localhost', KEY || 'missing', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export const photoUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`;
export const tl = (n: number | string) => `${Number(n).toLocaleString('tr-TR')} ₺`;

export type Row = {
  id: string; title: string; price: number | string; city: string; year?: number | null;
  listing_photos?: { path: string; position: number }[] | null;
};
