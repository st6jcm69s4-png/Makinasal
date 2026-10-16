import type { QueryResult } from '@/lib/supabase/result';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Listing, Review, Seller } from './data/types';

const BASE =
  'id,seller_id,kind,category,title,description,price,city,year,usage_value,usage_unit,spec,cond,compat,qty,status,created_at,listing_photos(path,position)';
// 005-ozellikler.sql çalıştırılmışsa gelen ek sütunlar
const EXTRA = 'brand,model,takas,serial_declared,prev_price,confirmed_at,boosted_until';

type Row = {
  id: string; seller_id: string; kind: string; category: string; title: string; description: string;
  price: number | string; city: string; year: number | null; usage_value: number | null; usage_unit: string | null;
  spec: string | null; cond: string | null; compat: string | null; qty: number | null; status: string; created_at: string;
  listing_photos: { path: string; position: number }[] | null;
  brand?: string | null; model?: string | null; takas?: boolean | null; serial_declared?: boolean | null;
  prev_price?: number | string | null; confirmed_at?: string | null; boosted_until?: string | null;
};

const DAY = 86_400_000;

export function rowToListing(row: Row, publicUrl: (path: string) => string): Listing {
  const photos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position).map((p) => publicUrl(p.path));
  const created = Date.parse(row.created_at);
  const confirmed = row.confirmed_at ? Date.parse(row.confirmed_at) : created;
  const price = Number(row.price);
  const prev = row.prev_price != null ? Number(row.prev_price) : undefined;
  return {
    id: row.id,
    cat: row.category,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    title: row.title,
    year: row.year ?? undefined,
    use: row.usage_value ?? undefined,
    unit: row.usage_unit === 'km' ? 'km' : row.usage_unit === 'saat' ? 'sa' : undefined,
    city: row.city,
    price,
    prev: prev && prev > price ? prev : undefined,
    sel: row.seller_id,
    conf: Math.max(0, Math.floor((Date.now() - confirmed) / DAY)),
    serial: !!row.serial_declared,
    takas: !!row.takas,
    desc: row.description,
    boost: !!row.boosted_until && Date.parse(row.boosted_until) > Date.now(),
    spec: row.spec ?? undefined,
    cond: row.cond ?? undefined,
    compat: row.compat ?? undefined,
    qty: row.qty ?? undefined,
    photos,
    status: row.status,
    createdAt: row.created_at,
    isNew: Date.now() - created < 3 * DAY,
  };
}

export const photoUrlFn = (supabase: SupabaseClient) => (path: string) =>
  supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;

/** Önce yeni sütunlarla dener; 005 henüz çalıştırılmadıysa temel sütunlara düşer. */
async function selectListings(supabase: SupabaseClient, build: (cols: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const first = await build(`${BASE},${EXTRA}`);
  if (!first.error) return first;
  return build(BASE);
}

const SELLER_FULL = 'id,full_name,store_name,is_store,is_premium,verified_phone,verified_id,verified_tax,city,created_at';
const SELLER_BASE = 'id,full_name,store_name,is_store,is_premium,verified_phone,city,created_at';

type Stat = {
  id: string; score: number | string; review_count: number | string; deals: number | string; reports: number | string;
  seller_score?: number | string; seller_reviews?: number | string; buyer_score?: number | string; buyer_reviews?: number | string;
};

export async function loadSellers(supabase: SupabaseClient, ids: string[]): Promise<Record<string, Seller>> {
  const out: Record<string, Seller> = {};
  if (ids.length === 0) return out;
  let pr: QueryResult = await supabase.from('profiles').select(SELLER_FULL).in('id', ids);
  if (pr.error) pr = await supabase.from('profiles').select(SELLER_BASE).in('id', ids);
  let sr: QueryResult = await supabase.from('user_stats')
    .select('id,score,review_count,deals,reports,seller_score,seller_reviews,buyer_score,buyer_reviews').in('id', ids);
  if (sr.error) sr = await supabase.from('user_stats').select('id,score,review_count,deals,reports').in('id', ids);
  const statById = new Map<string, Stat>();
  for (const s of (sr.data ?? []) as unknown as Stat[]) statById.set(s.id, s);
  for (const p of (pr.data ?? []) as unknown as Record<string, unknown>[]) {
    const id = p.id as string;
    const st = statById.get(id);
    const hasSplit = st && st.seller_reviews !== undefined;
    const sellerN = hasSplit ? Number(st.seller_reviews) : Number(st?.review_count ?? 0);
    const buyerN = hasSplit ? Number(st?.buyer_reviews ?? 0) : 0;
    const store = !!p.is_store;
    const verified = !!p.verified_phone && (hasSplit ? !!p.verified_id && (!store || !!p.verified_tax) : true);
    out[id] = {
      id,
      name: (store && (p.store_name as string)) || (p.full_name as string) || 'Üye',
      type: store ? 'Kurumsal' : 'Bireysel',
      ver: verified,
      prem: !!p.is_premium,
      s: st && sellerN > 0 ? Number(hasSplit ? st.seller_score : st.score) : null,
      b: st && buyerN > 0 ? Number(st.buyer_score) : null,
      bn: buyerN,
      deals: Number(st?.deals ?? 0),
      rep: Number(st?.reports ?? 0),
      city: (p.city as string | null) ?? '',
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
  const publicUrl = photoUrlFn(supabase);
  const { data, error } = await selectListings(supabase, (cols) =>
    supabase.from('listings').select(cols).eq('status', 'active').order('created_at', { ascending: false }).limit(300));
  if (error || !data) {
    console.error('İlanlar okunamadı:', error?.message);
    return { listings: [], sellers: {} };
  }
  const listings = (data as unknown as Row[]).map((r) => rowToListing(r, publicUrl));
  const sellers = await loadSellers(supabase, [...new Set(listings.map((l) => l.sel))]);
  return { listings, sellers };
}

/** Bir kullanıcının aldığı değerlendirmeler (en yeni önce). */
export async function fetchReviews(supabase: SupabaseClient, userId: string, limit = 20): Promise<Review[]> {
  let res: QueryResult = await supabase.from('reviews').select('score,comment,created_at,role,reviewer_id,tags')
    .eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (res.error) {
    res = await supabase.from('reviews').select('score,comment,created_at,role,reviewer_id')
      .eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(limit);
  }
  const rows = (res.data ?? []) as unknown as { score: number; comment: string | null; created_at: string; role: string; reviewer_id: string; tags?: string[] }[];
  const ids = [...new Set(rows.map((r) => r.reviewer_id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: ps } = await supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', ids);
    for (const p of ps ?? []) names.set(p.id as string, ((p.is_store && p.store_name) || p.full_name || 'Üye') as string);
  }
  return rows.map((r) => ({
    who: names.get(r.reviewer_id) ?? 'Üye',
    role: r.role === 'seller' ? 'Alıcı' : 'Satıcı',
    rating: Number(r.score),
    text: r.comment ?? '',
    date: new Date(r.created_at).toLocaleDateString('tr-TR'),
    tags: r.tags ?? [],
  }));
}

/** Tek ilan (satıldı/duraklatıldı da dahil; silinenler RLS ile gizli). */
export async function fetchListingById(supabase: SupabaseClient | null, id: string): Promise<{ listing: Listing; seller: Seller | null } | null> {
  if (!supabase) return null;
  const { data, error } = await selectListings(supabase, (cols) => supabase.from('listings').select(cols).eq('id', id).maybeSingle());
  if (error || !data) return null;
  const listing = rowToListing(data as unknown as Row, photoUrlFn(supabase));
  const sellers = await loadSellers(supabase, [listing.sel]);
  const seller = sellers[listing.sel] ?? null;
  if (seller) seller.reviews = await fetchReviews(supabase, listing.sel, 5);
  return { listing, seller };
}

/** Bir satıcının tüm yayındaki ilanları (mağaza sayfası). */
export async function fetchSellerListings(supabase: SupabaseClient, sellerId: string): Promise<Listing[]> {
  const { data } = await selectListings(supabase, (cols) =>
    supabase.from('listings').select(cols).eq('seller_id', sellerId).eq('status', 'active').order('created_at', { ascending: false }));
  return ((data ?? []) as unknown as Row[]).map((r) => rowToListing(r, photoUrlFn(supabase)));
}
