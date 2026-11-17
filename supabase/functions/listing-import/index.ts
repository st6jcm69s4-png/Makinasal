// Başka sitedeki ilanı ekran görüntülerinden aktarma.
// Kullanıcı kendi ilanının ekran görüntülerini gönderir; yapay zeka marka, model, yıl, kullanım, fiyat, il ve
// açıklamayı okuyup ilan formu alanlarını döndürür. Başka sitelere istek atılmaz (sayfa okunmaz).
// Gerekli gizli anahtar: ANTHROPIC_API_KEY (ai-assistant ile aynı). İsteğe bağlı: AI_MODEL_IMPORT.
// Sınır: kişi başına günde 15 aktarma (public.import_take_limit).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MACHINES: string[] = ["Ekskavatör", "Mini ekskavatör", "Lastikli ekskavatör", "Uzun bom ekskavatör", "Amfibik ekskavatör", "Beko Loder", "Lastikli yükleyici", "Mini yükleyici", "Paletli yükleyici", "Dozer", "Greyder", "Skreyper", "Trencher (kanal kazıcı)", "Manitou / teleskopik yükleyici", "Forklift", "İstif makinesi", "Reach truck", "Transpalet", "Vinç", "Mobil vinç", "Paletli vinç", "Kule vinç", "Hiab / araç üstü vinç", "Sepetli platform", "Makaslı platform", "Eklemli / teleskopik platform", "Beton (mikser ve pompa)", "Transmikser", "Beton pompası", "Sabit beton pompası", "Beton santrali", "Beton serme makinesi", "Shotcrete / püskürtme beton makinesi", "Kamyon", "Damperli kamyon", "Kırkayak kamyon", "Çekici (tır)", "Kurtarıcı (oto çekici)", "Lowbed", "Dorse / römork", "Tanker", "Arazöz / su tankeri", "Belden kırma kaya kamyonu", "Rijit kaya kamyonu", "Silindir", "Kompaktör", "Asfalt finişeri", "Asfalt frezesi", "Asfalt distribütörü", "Yol süpürme aracı", "Zemin stabilizasyon makinesi", "Yol çizgi makinesi", "Fore kazık makinesi", "Mini kazık / ankraj makinesi", "Diyafram duvar makinesi", "Sondaj makinesi", "Tünel açma makinesi (TBM)", "Delici jumbo", "Kırıcı / delici ataşman", "Kırma eleme tesisi", "Taş kırma makinesi", "Elek / yıkama tesisi", "Konveyör / bant sistemi", "Jeneratör", "Kompresör", "Motopomp / su pompası", "Işık kulesi", "Kaynak makinesi", "Endüstriyel temizlik makinesi", "Traktör", "Biçerdöver", "Tarım makinesi / ekipmanı", "Orman makinesi", "Liman / konteyner elleçleme makinesi", "Diğer iş makinesi"];
const PARTS: string[] = ["Yedek parça", "Lastik ve jant"];
const CITIES: string[] = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];
const GROUPS: string[] = ["engine", "hydraulics", "undercarriage", "transmission", "brakes", "electrical", "cooling", "fuel", "filters", "seals", "body", "attachments", "lifting", "tires", "exhaust", "other"];
const KM = new Set<string>(["Kamyon", "Çekici (tır)", "Kurtarıcı (oto çekici)", "Damperli kamyon", "Kırkayak kamyon", "Tanker", "Arazöz / su tankeri", "Transmikser", "Yol süpürme aracı"]);
const CONDITIONS = ["Sıfır", "Çıkma", "Revizyonlu"];
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 2_000_000; // ~1,5 MB görüntü
const MAX_BODY = 8_500_000;

const SYSTEM = `Sen Makinasal'ın ilan aktarma yardımcısısın. Kullanıcı, başka bir sitede veya uygulamada yayınladığı KENDİ iş makinesi, kamyon, yedek parça ya da lastik ilanının ekran görüntülerini gönderiyor.
Görevin: görüntülerde YAZAN bilgileri okuyup fill_listing aracını bir kez çağırmak.
Kurallar:
- Yalnızca görüntüde açıkça okunan bilgiyi yaz. Emin olmadığın alanı boş bırak (null). Tahmin etme, uydurma.
- category: aşağıdaki listeden en uygun TEK değer (birebir aynı yazım). Uygun yoksa makineler için "Diğer iş makinesi".
- city: Türkiye'nin 81 ilinden biri, listedeki yazımla. İlçe yazılıysa iline çevir.
- price: Türk lirası, yalnızca sayı (ör. "2.450.000 TL" → 2450000). Döviz ise null bırak ve notes'a yaz.
- usage_value: çalışma saati veya kilometre, yalnızca sayı.
- description: satıcının ilan açıklamasını Türkçe, düzgün paragraflar halinde aktar. Telefon numarası, e-posta, web adresi, IBAN, başka site adı ve "ilan no" gibi bilgileri ÇIKAR. Açıklama yoksa görüntüdeki teknik özelliklerden kısa ve doğru bir açıklama yaz.
- Görüntü bir ilan değilse is_listing=false ver.
- notes: kullanıcıya kısa Türkçe not (ör. "Fiyat euro olarak yazılmış, TL karşılığını gir.").

Makine kategorileri: ${MACHINES.join(" | ")}
Parça kategorileri: ${PARTS.join(" | ")}
Parça grupları (part_group, yalnız parça ilanlarında): ${GROUPS.join(", ")}
Parça durumu (cond): ${CONDITIONS.join(", ")}
İller: ${CITIES.join(", ")}`;

const TOOL = {
  name: "fill_listing",
  description: "İlan formunu ekran görüntülerinden okunan bilgilerle doldurur.",
  input_schema: {
    type: "object",
    properties: {
      is_listing: { type: "boolean" },
      category: { type: ["string", "null"] },
      brand: { type: ["string", "null"] },
      model: { type: ["string", "null"], description: "Model ya da parçada ürün adı" },
      year: { type: ["integer", "null"] },
      usage_value: { type: ["number", "null"] },
      usage_unit: { type: ["string", "null"], enum: ["saat", "km", null] },
      price: { type: ["number", "null"] },
      city: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      takas: { type: ["boolean", "null"] },
      cond: { type: ["string", "null"] },
      qty: { type: ["integer", "null"] },
      part_group: { type: ["string", "null"] },
      equipment_category: { type: ["string", "null"], description: "Parçanın uyduğu makine kategorisi" },
      compat: { type: ["string", "null"], description: "Parçanın uyumlu olduğu marka/modeller" },
      notes: { type: ["string", "null"] },
    },
    required: ["is_listing"],
  },
};

const tr = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
const pick = (v: unknown, list: string[]) => {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = tr(v);
  return list.find((x) => tr(x) === t) ?? null;
};
const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.replace(/\s+\n/g, "\n").trim().slice(0, n) : null);
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
};
// Açıklamadan iletişim bilgisi ve dış bağlantılar temizlenir (ilan kuralları ve mesaj güvenliği ile aynı)
const scrub = (s: string | null) => s
  ? s.replace(/(https?:\/\/|www\.)\S+/gi, "")
     .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "")
     .replace(/\bTR\s?\d{2}(\s?\d{4}){5}\s?\d{2}\b/gi, "")
     .replace(/(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "")
     .replace(/sahibinden(\.com)?|arabam(\.com)?|letgo|mascus|machineryline/gi, "")
     .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000)
  : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return json({ error: "too_large" }, 413);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "auth" }, 401);

  let body: { images?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "bad_request" }, 400); }
  const images = Array.isArray(body.images) ? body.images.filter((x): x is string => typeof x === "string") : [];
  if (!images.length || images.length > MAX_IMAGES) return json({ error: "bad_request" }, 400);
  if (images.some((b) => b.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(b.slice(0, 200)))) return json({ error: "too_large" }, 413);
  // Gerçekten JPEG mi (ilk baytlar FF D8 FF → base64 "/9j/")
  if (images.some((b) => !b.startsWith("/9j/"))) return json({ error: "bad_image" }, 400);

  const lim = await admin.rpc("import_take_limit", { p_uid: user.id });
  if (lim.error) return json({ error: "server" }, 500);
  if (lim.data !== true) return json({ error: "limit" }, 429);

  try {
    const model = Deno.env.get("AI_MODEL_IMPORT") ?? "claude-haiku-5-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model, max_tokens: 1500, system: SYSTEM,
        tools: [TOOL], tool_choice: { type: "tool", name: "fill_listing" },
        messages: [{ role: "user", content: [
          ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
          { type: "text", text: "Bu ekran görüntüleri benim ilanıma ait. Bilgileri fill_listing ile aktar." },
        ] }],
      }),
    });
    if (!res.ok) throw new Error(`ai ${res.status}`);
    const out = await res.json() as { content?: { type: string; name?: string; input?: Record<string, unknown> }[] };
    const r = out.content?.find((c) => c.type === "tool_use" && c.name === "fill_listing")?.input;
    if (!r) throw new Error("empty");
    if (r.is_listing === false) return json({ ok: false, reason: "not_listing" });

    const category = pick(r.category, [...MACHINES, ...PARTS]);
    const part = !!category && PARTS.includes(category);
    const year = num(r.year, 1950, new Date().getFullYear() + 1);
    const fields = {
      category,
      brand: str(r.brand, 60),
      model: str(r.model, 80),
      year: part ? null : year,
      usage_value: part ? null : num(r.usage_value, 0, 5_000_000),
      usage_unit: part ? null : (category ? (KM.has(category) ? "km" : "saat") : (r.usage_unit === "km" ? "km" : r.usage_unit === "saat" ? "saat" : null)),
      price: num(r.price, 1, 2_000_000_000),
      city: pick(r.city, CITIES),
      description: scrub(str(r.description, 6000)),
      takas: typeof r.takas === "boolean" ? r.takas : null,
      cond: part ? pick(r.cond, CONDITIONS) : null,
      qty: part ? num(r.qty, 1, 100000) : null,
      part_group: part && typeof r.part_group === "string" && GROUPS.includes(r.part_group) ? r.part_group : null,
      equipment_category: part ? pick(r.equipment_category, MACHINES) : null,
      compat: part ? str(r.compat, 200) : null,
    };
    return json({ ok: true, fields, notes: str(r.notes, 300) });
  } catch (_e) {
    await admin.rpc("import_refund_limit", { p_uid: user.id });
    return json({ error: "ai_failed" }, 502);
  }
});
