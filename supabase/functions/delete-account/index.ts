// Uygulama içinden hesap silme (Apple 5.1.1(v), KVKK m.7).
// 1) Çağıran kullanıcı kendi oturumuyla doğrulanır (yalnızca kendi hesabını silebilir).
// 2) İlan fotoğrafları ve videoları depodan silinir.
// 3) Veritabanı: profil "Silinmiş üye" olur, ilanlar ve iş ağı kayıtları kalkar (public.delete_account_data).
//    Mesajlar, ödemeler ve değerlendirmeler karşı tarafın kaydı ve yasal saklama nedeniyle anonim olarak kalır.
// 4) Giriş kalıcı olarak kapatılır: e-posta / telefon / ad bilgisi silinir, hesap süresiz engellenir.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'AUTH' }, 401);
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who, error: whoErr } = await asUser.auth.getUser();
  const uid = who?.user?.id;
  if (whoErr || !uid) return json({ error: 'AUTH' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Depodaki dosyalar (veritabanı satırları kaldırılmadan önce yolları toplanır)
  const { data: lst } = await admin.from('listings').select('id,video_path').eq('seller_id', uid).limit(1000);
  const listings = (lst ?? []) as { id: string; video_path: string | null }[];
  const ids = listings.map((l) => l.id);
  const photos: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from('listing_photos').select('path').in('listing_id', ids.slice(i, i + 200));
    for (const p of (data ?? []) as { path: string }[]) photos.push(p.path);
  }

  // Veritabanı (açık artırma engeli varsa burada durur, hiçbir şey silinmez)
  const del = await admin.rpc('delete_account_data', { p_uid: uid });
  if (del.error) {
    if ((del.error.message ?? '').includes('ACTIVE_AUCTION')) return json({ error: 'ACTIVE_AUCTION' }, 409);
    return json({ error: 'DB' }, 500);
  }

  for (let i = 0; i < photos.length; i += 100) await admin.storage.from('listing-photos').remove(photos.slice(i, i + 100));
  const videos = listings.map((l) => l.video_path).filter((v): v is string => !!v);
  for (let i = 0; i < videos.length; i += 100) await admin.storage.from('listing-videos').remove(videos.slice(i, i + 100));
  if (videos.length) await admin.from('listings').update({ video_path: null }).eq('seller_id', uid);

  // Giriş kapatılır ve kimlik bilgileri silinir
  const up = await admin.auth.admin.updateUserById(uid, {
    email: `silinmis-${uid}@deleted.invalid`,
    email_confirm: true,
    user_metadata: {},
    ban_duration: '876000h',
  });
  if (up.error) return json({ error: 'AUTH_UPDATE' }, 500);
  await admin.auth.admin.signOut(auth.slice(7), 'global').catch(() => undefined);

  return json({ ok: true });
});
