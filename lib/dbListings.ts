import type { SupabaseClient } from '@supabase/supabase-js';
import type { Listing, Seller } from './data/types';

const COLUMNS =
  'id,seller_id,kind,category,title,description,price,city,year,usage_value,usage_unit,spec,cond,compat,qty,status,created_at,listing_photos(path,position)';

type Row = {
  id: string; seller_id: string; kind: string; category: string; title: string; description: string;
  price: number | string; city: string; year: number | null; usage_value: number | null; usage_unit: string | null;
  spec: string | null; cond: string | null; compat: string | null; qty: number | null; status: string; created_at: string;
  listing_photos: { path: string; position: number }[] | null;
};

export function rowToListing(row: Row, publicUrl: (path: string) => string): Listing {
  const photos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position).map((p) => publicUrl(p.path));
  return {
    id: row.id,
    cat: row.category,
    title: row.title,
    year: row.year ?? undefined,
    use: row.usage_value ?? undefined,
    unit: row.usage_unit === 'km' ? 'km' : row.usage_unit === 'saat' ? 'sa' : undefined,
    city: row.city,
    price: Number(row.price),
    sel: row.seller_id,
    conf: 0,
    desc: row.description,
    spec: row.spec ?? undefined,
    cond: row.cond ?? undefined,
    compat: row.compat ?? undefined,
    qty: row.qty ?? undefined,
    photos,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function loadSellers(supabase: SupabaseClient, ids: string[]): Promise<Record<string, Seller>> {
  const out: Record<string, Seller> = {};
  if (ids.length === 0) return out;
  const [profiles, stats] = await Promise.all([
    supabase.from('profiles').select('id,full_name,store_name,is_store,is_premium,verified_phone,city,created_at').in('id', ids),
    supabase.from('user_stats').select('id,score,review_count,deals,reports').in('id', ids),
  ]);
  const statById = new Map<string, { score: number; review_count: number; deals: number; reports: number }>();
  for (const s of stats.data ?? []) {
    statById.set(s.id as string, {
      score: Number(s.score), review_count: Number(s.review_count), deals: Number(s.deals), reports: Number(s.reports),
    });
  }
  for (const p of profiles.data ?? []) {
    const st = statById.get(p.id as string);
    out[p.id as string] = {
      name: (p.is_store && p.store_name) || p.full_name || 'Üye',
      type: p.is_store ? 'Kurumsal' : 'Bireysel',
      ver: !!p.verified_phone,
      prem: !!p.is_premium,
      s: st && st.review_count > 0 ? st.score : null,
      b: null,
      deals: st?.deals ?? 0,
      rep: st?.reports ?? 0,
      city: p.city ?? '',
      since: new Date(p.created_at as string).getFullYear(),
      reviews: [],
    };
  }
  return out;
}

export type DbData = { listings: Listing[]; sellers: Record<string, Seller> };

/** Yayındaki gerçek ilanlar. Hata olursa boş döner (site demo verisiyle açılır). */
export async function fetchActiveListings(supabase: SupabaseClient | null): Promise<DbData> {
  if (!supabase) return { listings: [], sellers: {} };
  const publicUrl = (path: string) => supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
  const { data, error } = await supabase
    .from('listings').select(COLUMNS).eq('status', 'active').order('created_at', { ascending: false }).limit(200);
  if (error || !data) {
    console.error('İlanlar okunamadı:', error?.message);
    return { listings: [], sellers: {} };
  }
  const listings = (data as unknown as Row[]).map((r) => rowToListing(r, publicUrl));
  const sellers = await loadSellers(supabase, [...new Set(listings.map((l) => l.sel))]);
  return { listings, sellers };
}

/** Tek ilan (satıldı/duraklatıldı da dahil; silinenler RLS ile gizli). */
export async function fetchListingById(supabase: SupabaseClient | null, id: string): Promise<{ listing: Listing; seller: Seller | null } | null> {
  if (!supabase) return null;
  const publicUrl = (path: string) => supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
  const { data, error } = await supabase.from('listings').select(COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const listing = rowToListing(data as unknown as Row, publicUrl);
  const sellers = await loadSellers(supabase, [listing.sel]);
  const seller = sellers[listing.sel] ?? null;
  if (seller) {
    const { data: rv } = await supabase
      .from('reviews').select('score,comment,created_at,role,reviewer_id')
      .eq('reviewee_id', listing.sel).order('created_at', { ascending: false }).limit(5);
    const reviewerIds = [...new Set((rv ?? []).map((r) => r.reviewer_id as string))];
    const names = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const { data: ps } = await supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', reviewerIds);
      for (const p of ps ?? []) names.set(p.id as string, ((p.is_store && p.store_name) || p.full_name || 'Üye') as string);
    }
    seller.reviews = (rv ?? []).map((r) => ({
      who: names.get(r.reviewer_id as string) ?? 'Üye',
      role: r.role === 'seller' ? 'Alıcı' : 'Satıcı',
      rating: Number(r.score),
      text: (r.comment as string | null) ?? '',
      date: new Date(r.created_at as string).toLocaleDateString('tr-TR'),
      tags: [],
    }));
  }
  return { listing, seller };
}
