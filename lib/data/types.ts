export type Review = { who: string; role: string; rating: number; text: string; date: string; tags: string[] };

export type Seller = {
  id?: string;
  name: string;
  type: 'Kurumsal' | 'Bireysel';
  /** Kimlik / telefon doğrulaması yapılmış mı */
  ver: boolean;
  prem?: boolean;
  /** Satıcı olarak aldığı puan (yoksa null) */
  s: number | null;
  /** Alıcı olarak aldığı puan (yoksa null) */
  b: number | null;
  bn?: number;
  /** Onaylı işlem sayısı */
  deals: number;
  /** Moderatörün doğruladığı şikayet sayısı */
  rep: number;
  city: string;
  district?: string;
  bio?: string;
  companyBio?: string;
  since: number;
  reviews: Review[];
};

export type Listing = {
  id: number | string;
  cat: string;
  brand?: string;
  model?: string;
  title?: string;
  year?: number;
  use?: number;
  unit?: string;
  city: string;
  price: number;
  /** Önceki (daha yüksek) fiyat; yalnızca fiyat düştüyse dolu */
  prev?: number;
  /** Satıcı anahtarı (demo: harf, gerçek: kullanıcı id'si) */
  sel: string;
  /** Satıcının "hâlâ satılık" dediği günden bu yana geçen gün */
  conf: number;
  serial?: boolean;
  takas?: boolean;
  desc: string;
  /** Tek ilan öne çıkarma (7 gün) */
  boost?: boolean;
  photos?: string[];
  demo?: boolean;
  status?: string;
  createdAt?: string;
  isNew?: boolean;
  spec?: string;
  cond?: string;
  compat?: string;
  qty?: number;
};
