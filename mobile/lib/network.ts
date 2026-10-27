// Web lib/network.ts içindeki sabitler ve yardımcılar (mobil kopya).
export const POST_KINDS = { rental_machine: 'Kiralık makine / kamyon', rental_operator: 'Operatör ve ustalar', job: 'İş talepleri', part_request: 'Parça talepleri' } as const;
export type PostKind = keyof typeof POST_KINDS;
export const PERSONNEL_ROLES = { operator: 'Operatör', driver: 'Kamyon / tır şoförü', mechanic: 'Usta / servis' } as const;
export const RENTAL_MODES = { with_operator: 'Operatörlü / şoförlü', machine_only: 'Sadece makine / araç' } as const;
export const PROVIDER_KINDS = { excavation: 'Hafriyat firması', supplier: 'Yedek parça satışı', operator: 'Operatör', rental: 'Makine kiralama', tow: 'Çekici / yol yardım' } as const;
export const COMPANY_CATEGORIES = ['Hafriyat şirketi', 'Nakliye şirketi', 'Makine kiralama şirketi', 'Parça tedarikçisi', 'Çekici / yol yardım', 'Diğer şirket'] as const;
export const ACTIVITIES = ['Çekici ve yol yardım', 'Hafriyat', 'Temel kazısı', 'Yıkım', 'Nakliye', 'Moloz taşıma', 'Dolgu ve tesviye', 'Vinç hizmeti', 'Makine kiralama', 'Operatörlük', 'İş makinesi parçası', 'Kamyon parçası', 'Lastik ve jant'];
export const UNITS = ['toplam', 'saat', 'gün', 'ay', 'adet'] as const;
export const QUOTE_STATUS: Record<string, string> = { pending: 'Bekliyor', accepted: 'Seçildi', declined: 'Reddedildi', withdrawn: 'Geri çekildi' };
export const EQUIPMENT_STATUS: Record<string, string> = { available: 'Müsait', busy: 'İşte / kullanımda', maintenance: 'Bakımda' };

export type MarketPost = {
  id: string; owner_id: string; preferred_provider: string | null; kind: PostKind; rental_mode: string | null; personnel_role: string | null;
  brand: string; model: string; title: string; description: string; category: string; city: string; district: string;
  start_date: string | null; end_date: string | null; price: number | null; price_unit: string; quantity: number; specs: string;
  status: 'open' | 'closed' | 'removed'; created_at: string;
};
export type Provider = {
  user_id: string; name: string; kind: keyof typeof PROVIDER_KINDS; company_category: string | null; description: string; city: string; district: string;
  service_cities: string[]; specialties: string[]; published: boolean;
};
export type Quote = {
  id: string; post_id: string; owner_id: string; bidder_id: string; display_name: string; amount: number; price_unit: string; note: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'; created_at: string;
};

export function money(amount: number | string | null, unit = 'toplam') {
  return amount == null ? 'Bütçe belirtilmedi' : `${Number(amount).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺${unit === 'toplam' ? ' toplam' : ` / ${unit}`}`;
}
export function networkError(error: { code?: string; message?: string } | null) {
  if (error?.message?.includes('MESSAGE_PROFANITY')) return 'Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.';
  if (error?.message?.includes('RATE_LIMIT')) return 'Çok fazla işlem. Bir dakika sonra tekrar dene.';
  if (error?.code === '23505') return 'Bu ilana zaten teklif verdin veya bu iş için bir teklif seçilmiş. Sayfayı yenile.';
  if (error?.code === '42501') return 'Bu işlem için yetkin yok. Hesabını ve oturumunu kontrol et.';
  return 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.';
}
export const dateLabel = (v: string | null) => (v ? new Date(v + 'T12:00:00').toLocaleDateString('tr-TR') : '');
export const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
