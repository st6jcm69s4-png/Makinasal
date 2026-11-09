// Günlük temizlik (pg_cron 'cleanup-videos' çağırır): satılan veya kaldırılan ilanların videoları
// 30 gün sonra depodan silinir. Çağrı, veritabanı kasasındaki (vault) cron_secret ile doğrulanır.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const secret = req.headers.get('x-cron-secret') ?? '';
  const ok = secret ? await admin.rpc('cron_secret_ok', { p: secret }) : { data: false };
  if (ok.data !== true) return new Response('Forbidden', { status: 403 });

  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin.from('listings')
    .select('id,video_path')
    .in('status', ['sold', 'removed'])
    .lt('status_changed_at', cutoff)
    .not('video_path', 'is', null)
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { id: string; video_path: string }[];
  let removed = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const rm = await admin.storage.from('listing-videos').remove(chunk.map((r) => r.video_path));
    if (rm.error) continue;
    const upd = await admin.from('listings').update({ video_path: null }).in('id', chunk.map((r) => r.id));
    if (!upd.error) removed += chunk.length;
  }
  return Response.json({ checked: rows.length, removed });
});
