/**
 * Veritabanı / sunucu hata metnini kullanıcıya gösterilecek cümleye çevirir.
 * Kendi kurallarımızın Türkçe mesajları gösterilir; teknik İngilizce metinler (tablo, kural, sütun adları)
 * hiçbir zaman gösterilmez, yerine anlaşılır bir cümle kullanılır.
 * Web kopyası: lib/friendlyError.ts
 */
const KNOWN: [RegExp, string][] = [
  [/RATE_LIMIT/, "Çok fazla işlem. Biraz bekleyip tekrar dene."],
  [/LISTING_QUOTA/, "Bu dönemdeki ilan hakkın doldu. Premium tarifelere bakabilir ya da ek ilan hakkı alabilirsin."],
  [/MESSAGE_PROFANITY/, "Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle."],
  [/MESSAGE_BLOCKED/, "Bu kullanıcıyla mesajlaşma kapalı."],
  [/AUCTION_HAS_BIDS/, "Teklif almış açık artırma sürerken ilan değiştirilemez."],
  [/PREMIUM_REQUIRED/, "Bu özellik Premium üyelere açık."],
  [/ACTIVE_AUCTION/, "Süren bir açık artırman varken bu işlem yapılamaz."],
  [/duplicate key|unique constraint|already exists/i, "Bu kayıt zaten var."],
  [/failed to fetch|network ?error|network request failed|load failed|timeout/i, "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene."],
  [/jwt|not authenticated|auth session|invalid claim|giriş gerekli/i, "Oturumun sona ermiş olabilir. Tekrar giriş yap."],
];
const TECHNICAL = /violates|syntax|column|relation|function|permission denied|pgrst|null value|invalid input|constraint|schema|policy|operator|does not exist|row-level|uuid|record|trigger|sqlstate|error:/i;
const TURKISH = /[ğüşıöçĞÜŞİÖÇ]/;

export function friendlyError(message: unknown, fallback = "İşlem tamamlanamadı. Tekrar dene."): string {
  const m = (typeof message === "string" ? message : message instanceof Error ? message.message : "").trim();
  if (!m) return fallback;
  for (const [re, text] of KNOWN) if (re.test(m)) return text;
  const coded = /^[A-Z_]{4,}:\s*(.+)$/.exec(m);
  if (coded && TURKISH.test(coded[1])) return coded[1].slice(0, 240);
  if (TECHNICAL.test(m) || !TURKISH.test(m)) return fallback;
  return m.slice(0, 240);
}
