// Apple App Store / Google Play satın alma bildirimleri (RevenueCat webhook).
// RevenueCat panelinde Webhook adresi: https://<proje>.supabase.co/functions/v1/revenuecat-webhook
// Yetki: RevenueCat'te girilen "Authorization header" değeri, Supabase gizli anahtarı REVENUECAT_WEBHOOK_SECRET ile aynı olmalı.
// Ürün kimlikleri: makinasal.pro.monthly / makinasal.pro.yearly / makinasal.business.monthly / makinasal.business.yearly
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

type Ev = {
  id: string; type: string; app_user_id?: string; original_app_user_id?: string; aliases?: string[];
  product_id?: string; new_product_id?: string; expiration_at_ms?: number | null; environment?: string; store?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const planOf = (product?: string) => (!product ? null : /business|firma/i.test(product) ? 'business' : /pro/i.test(product) ? 'pro' : null);

// Equal-time karşılaştırma (yetki anahtarı tahmin edilmesin)
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!secret) return new Response('Not configured', { status: 503 });
  const auth = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!same(auth, secret)) return new Response('Forbidden', { status: 403 });

  let body: { event?: Ev };
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const ev = body.event;
  if (!ev?.id || !ev.type) return new Response('Bad request', { status: 400 });

  // Uygulama, RevenueCat'e Supabase kullanıcı kimliğiyle giriş yapar (Purchases.logIn(uid))
  const uid = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])].find((x) => x && UUID.test(x)) ?? null;
  const product = ev.type === 'PRODUCT_CHANGE' ? (ev.new_product_id ?? ev.product_id) : ev.product_id;
  const expires = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Olay kaydı (aynı olay tekrar gelirse yinelenen kayıt hatası: işlem yine de güvenle tekrarlanabilir)
  const log = await admin.from('store_events').insert({
    id: ev.id, user_id: uid, type: ev.type, product_id: product ?? null, store: ev.store ?? null,
    environment: ev.environment ?? null, expires_at: expires, payload: body,
  });
  if (log.error && log.error.code !== '23505') return new Response('DB', { status: 500 });
  if (!uid) return Response.json({ ok: true, skipped: 'no-user' });
  if (ev.type === 'TEST') return Response.json({ ok: true });

  const plan = planOf(product);
  let r;
  switch (ev.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
      r = await admin.rpc('set_store_premium', { p_uid: uid, p_plan: plan, p_until: expires });
      break;
    case 'EXPIRATION':
      r = await admin.rpc('set_store_premium', { p_uid: uid, p_plan: null, p_until: null });
      break;
    default:
      // CANCELLATION (yenileme kapandı ama süre bitene kadar sürer), BILLING_ISSUE vb.: üyelik değişmez
      return Response.json({ ok: true, ignored: ev.type });
  }
  if (r.error) return new Response('DB', { status: 500 });
  return Response.json({ ok: true });
});
