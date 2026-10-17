export const POST_KINDS = {
  rental_machine: "Kiralık iş makinesi / kamyon",
  rental_operator: "Operatör ve ustalar",
  job: "İş talebi",
  part_request: "Parça talebi",
} as const;
export const PERSONNEL_ROLES = { operator: "Operatör", driver: "Kamyon / tır şoförü", mechanic: "Usta / servis" } as const;
export type PersonnelRole = keyof typeof PERSONNEL_ROLES;
export type PostKind = keyof typeof POST_KINDS;
export const PROVIDER_KINDS = {
  excavation: "Hafriyat firması",
  supplier: "Parçacı",
  operator: "Operatör",
  rental: "Makine kiralama",
} as const;
export const ACTIVITIES = [
  "Hafriyat",
  "Temel kazısı",
  "Yıkım",
  "Nakliye",
  "Moloz taşıma",
  "Dolgu ve tesviye",
  "Vinç hizmeti",
  "Makine kiralama",
  "Operatörlük",
  "İş makinesi parçası",
  "Kamyon parçası",
  "Lastik ve jant",
];
export const UNITS = ["toplam", "saat", "gün", "ay", "adet"] as const;
export type MarketPost = {
  id: string;
  owner_id: string;
  preferred_provider: string | null;
  kind: PostKind;
  rental_mode: RentalMode | null;
  personnel_role: PersonnelRole | null;
  brand: string;
  model: string;
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  price_unit: string;
  quantity: number;
  specs: string;
  status: "open" | "closed" | "removed";
  created_at: string;
};
export type Provider = {
  company_category: string | null;
  user_id: string;
  name: string;
  kind: keyof typeof PROVIDER_KINDS;
  description: string;
  city: string;
  district: string;
  service_cities: string[];
  specialties: string[];
  lat: number | null;
  lng: number | null;
  published: boolean;
};
export type Quote = {
  id: string;
  post_id: string;
  owner_id: string;
  bidder_id: string;
  display_name: string;
  amount: number;
  price_unit: string;
  note: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
};
export const QUOTE_STATUS = {
  pending: "Bekliyor",
  accepted: "Seçildi",
  declined: "Reddedildi",
  withdrawn: "Geri çekildi",
};
export function money(amount: number | string | null, unit = "toplam") {
  return amount == null
    ? "Bütçe belirtilmedi"
    : `${Number(amount).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺${unit === "toplam" ? " toplam" : ` / ${unit}`}`;
}
export function validKind(value: string | null): PostKind {
  return value && Object.prototype.hasOwnProperty.call(POST_KINDS, value)
    ? (value as PostKind)
    : "job";
}
export function dateLabel(value: string | null) {
  if (!value) return "";
  return new Date(value + "T12:00:00").toLocaleDateString("tr-TR");
}
export function validCoordinates(lat: number | null, lng: number | null) {
  return (
    (lat === null && lng === null) ||
    (lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180)
  );
}
export function networkError(
  error: { code?: string; message?: string } | null,
) {
  if (error?.code === "23505")
    return "Bu ilana zaten teklif verdin veya bu iş için bir teklif seçilmiş. Sayfayı yenile.";
  if (error?.code === "42501")
    return "Bu işlem için yetkin yok. Hesabını ve oturumunu kontrol et.";
  return "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
}

export const COMPANY_CATEGORIES = [
  "Hafriyat şirketi",
  "Nakliye şirketi",
  "Makine kiralama şirketi",
  "Parça tedarikçisi",
  "Diğer şirket",
] as const;
export const EQUIPMENT_STATUS = {
  available: "Müsait",
  busy: "İşte / kullanımda",
  maintenance: "Bakımda",
} as const;
export type InventoryItem = {
  id: string;
  owner_id: string;
  category: string;
  brand: string;
  model: string;
  year: number | null;
  quantity: number;
  capacity: string;
  description: string;
  availability: keyof typeof EQUIPMENT_STATUS;
  published: boolean;
};

export const RENTAL_MODES = {
  with_operator: "Operatörlü / şoförlü",
  machine_only: "Sadece makine / araç",
} as const;
export type RentalMode = keyof typeof RENTAL_MODES;
export function rentalModeLabel(mode: string | null | undefined) {
  return mode && Object.prototype.hasOwnProperty.call(RENTAL_MODES, mode)
    ? RENTAL_MODES[mode as RentalMode]
    : "Operatör / şoför durumu belirtilmedi";
}
