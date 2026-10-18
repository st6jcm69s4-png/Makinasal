import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getServerSupabase } from '@/lib/supabase/server';
import { LEGAL_SLUGS } from '@/lib/legal';

export const revalidate = 3600;

const STATIC = ['', '/ilanlar', '/yedek-parca', '/kiralik', '/operatorler', '/isler', '/parca-talepleri', '/firmalar', '/sirketler', '/magaza', '/guven', '/destek', '/premium'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    ...STATIC.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.7 })),
    ...LEGAL_SLUGS.map((s) => ({ url: `${SITE_URL}/hukuki/${s}`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 })),
  ];
  const supabase = getServerSupabase();
  if (!supabase) return entries;
  // Sitemap en fazla 50.000 adres taşıyabilir; en yeni 5.000 aktif ilan yeterlidir.
  const { data } = await supabase.from('listings').select('id,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(5000);
  for (const r of data ?? []) entries.push({ url: `${SITE_URL}/ilanlar/${r.id}`, lastModified: new Date(r.created_at), changeFrequency: 'weekly', priority: 0.8 });
  return entries;
}
