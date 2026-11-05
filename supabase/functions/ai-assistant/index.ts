// Makinasal premium yapay zeka iş asistanı.
// Gerekli gizli anahtar (Supabase > Edge Functions > Secrets): ANTHROPIC_API_KEY
// İsteğe bağlı: AI_MODEL_PRO ve AI_MODEL_BUSINESS (ikisinin de varsayılanı claude-haiku-5-5; maliyet için)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Sen Makinasal'ın premium üyelere özel iş asistanısın.
Makinasal; Türkiye'de iş makinesi, kamyon, çekici, forklift, vinç, yedek parça ve lastik alım-satım ilanları ile kiralık makine, operatör/şoför/usta, iş talepleri, parça talepleri ve şirket profillerinin bulunduğu bir pazar yeridir.

Görevin kullanıcının şu hedeflerine somut olarak yardım etmek:
- Kişisel veya firma profilini güçlendirmek (açıklama, hizmet bölgeleri, uzmanlık alanları, doğrulamalar).
- İlanlarını daha hızlı ve doğru fiyata satmak (başlık, açıklama, fotoğraf, eksik teknik bilgi, fiyat konumu).
- İş bulmak, eleman (operatör, şoför, usta) bulmak, makine veya parça bulmak.

Kurallar:
- Aşağıdaki HESAP BİLGİLERİ'ni kullan. Orada olmayan bilgiyi uydurma; gerekiyorsa kısa bir soru sor.
- Somut ol: yeniden yazılmış başlık ve açıklama örnekleri ver; eklenmesi gereken bilgileri say (model yılı, çalışma saati veya kilometre, seri/şasi no, bakım geçmişi, hasar durumu, ekipmanlar, fotoğraf açıları).
- Fiyat için kesin değer veya satış garantisi verme; benzer ilanlarla karşılaştırmayı ve fiyat aralığı mantığını anlat.
- Uygulamadaki özelliklere yönlendir: İş Ağı (iş talepleri, kiralık makineler, operatör ve ustalar, şirketler), Parça talepleri, Yedek parça araması, Kayıtlı aramalar (yeni ilan bildirimi), Firma profilim, Envanterim, Hesap güvenliği (telefon, kimlik, vergi levhası doğrulaması).
- Güvenlik: ürünü görmeden kapora veya ön ödeme önerme. Güven puanı ve doğrulama rozetleri satın alınamaz. Mesajlarda IBAN ve dış bağlantı paylaşımı engellidir.
- Hukuki, vergi ve finansal konularda kesin hüküm verme; bir uzmana danışmasını öner.
- Makinasal dışındaki konulara kısa ve kibar bir cümleyle dön.
- Kullanıcının yazdığı dilde yanıt ver (Türkçe, İngilizce veya Almanca; Almancada "Sie" kullan).
- Kısa ve düzenli yaz: en fazla yaklaşık 180 kelime. Başlık (#) ve kalın yazı (**) kullanma; madde için "• " kullan.`;

const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "auth" }, 401);

  let body: { messages?: Msg[] };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "bad_request" }, 400);

  const { data: quota, error: quotaError } = await admin.rpc("ai_take_quota", { p_user: user.id });
  if (quotaError) return json({ error: "server" }, 500);
  if (!quota?.ok) return json({ error: quota?.reason ?? "not_premium", limit: quota?.limit ?? null }, quota?.reason === "quota" ? 429 : 402);

  try {
    const [profile, provider, listings, posts, stats] = await Promise.all([
      admin.from("profiles").select("full_name,city,district,bio,company_bio,is_store,store_name,verified_phone,verified_id,verified_tax,premium_plan").eq("id", user.id).maybeSingle(),
      admin.from("service_providers").select("name,kind,company_category,description,city,district,service_cities,specialties,published").eq("user_id", user.id).maybeSingle(),
      admin.from("listings").select("title,category,brand,model,price,city,year,usage_value,usage_unit,status,moderation_status,description,created_at,listing_photos(count)").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10),
      admin.from("market_posts").select("kind,title,description,city,status,price,price_unit,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(10),
      admin.from("user_stats").select("seller_score,seller_reviews,deals").eq("id", user.id).maybeSingle(),
    ]);
    const p = profile.data ?? {} as Record<string, unknown>;
    const lines: string[] = ["HESAP BİLGİLERİ"];
    lines.push(`Ad: ${clip(p.full_name, 80)} | İl/ilçe: ${clip(p.city, 40)} ${clip(p.district, 40)} | Firma hesabı: ${p.is_store ? "evet, " + clip(p.store_name, 80) : "hayır"} | Tarife: ${clip(p.premium_plan, 20)}`);
    lines.push(`Doğrulamalar: telefon ${p.verified_phone ? "var" : "yok"}, kimlik ${p.verified_id ? "var" : "yok"}, vergi levhası ${p.verified_tax ? "var" : "yok"}`);
    lines.push(`Kişisel açıklama: ${clip(p.bio, 400) || "(boş)"}`);
    lines.push(`Firma açıklaması: ${clip(p.company_bio, 600) || "(boş)"}`);
    const s = stats.data as Record<string, unknown> | null;
    if (s) lines.push(`Satıcı puanı: ${s.seller_score ?? "-"} (${s.seller_reviews ?? 0} değerlendirme, ${s.deals ?? 0} anlaşma)`);
    const f = provider.data as Record<string, unknown> | null;
    lines.push(f
      ? `İş Ağı firma profili: ${clip(f.name, 80)} | tür: ${clip(f.kind, 30)} ${clip(f.company_category, 40)} | yayında: ${f.published ? "evet" : "hayır"} | il: ${clip(f.city, 40)} | hizmet illeri: ${clip((f.service_cities as string[] | null)?.join(", "), 200)} | uzmanlıklar: ${clip((f.specialties as string[] | null)?.join(", "), 200)} | açıklama: ${clip(f.description, 500)}`
      : "İş Ağı firma profili: yok");
    const ls = (listings.data ?? []) as Record<string, unknown>[];
    lines.push(`Satış ilanları (${ls.length}):`);
    for (const l of ls) {
      const photos = (l.listing_photos as { count: number }[] | null)?.[0]?.count ?? 0;
      lines.push(`- ${clip(l.title, 90)} | ${clip(l.category, 30)} ${clip(l.brand, 30)} ${clip(l.model, 30)} | ${l.price ?? "-"} TL | ${clip(l.city, 30)} | yıl ${l.year ?? "-"} | kullanım ${l.usage_value ?? "-"} ${clip(l.usage_unit, 6)} | durum ${clip(l.status, 12)}/${clip(l.moderation_status, 12)} | ${photos} fotoğraf | açıklama: ${clip(l.description, 220)}`);
    }
    const ps = (posts.data ?? []) as Record<string, unknown>[];
    lines.push(`İş Ağı ilanları (${ps.length}):`);
    for (const m of ps) lines.push(`- [${clip(m.kind, 20)}] ${clip(m.title, 90)} | ${clip(m.city, 30)} | ${clip(m.status, 10)} | ${m.price ?? "-"} ${clip(m.price_unit, 10)} | ${clip(m.description, 200)}`);

    const plan = String(quota.plan);
    const model = plan === "business"
      ? (Deno.env.get("AI_MODEL_BUSINESS") ?? "claude-haiku-5-5")
      : (Deno.env.get("AI_MODEL_PRO") ?? "claude-haiku-5-5");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 700, system: `${SYSTEM}\n\n${lines.join("\n").slice(0, 6000)}`, messages }),
    });
    if (!res.ok) throw new Error(`ai ${res.status}`);
    const out = await res.json() as { content?: { type: string; text?: string }[] };
    const reply = (out.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
    if (!reply) throw new Error("empty");
    return json({ reply, used: quota.used, limit: quota.limit, plan });
  } catch (_e) {
    await admin.rpc("ai_refund_quota", { p_user: user.id });
    return json({ error: "ai_failed" }, 502);
  }
});
