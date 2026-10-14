export type Review = { who: string; role: string; rating: number; text: string; date: string; tags: string[] };
export type Seller = {
  name: string; type: 'Kurumsal' | 'Bireysel'; ver: boolean; prem?: boolean;
  s: number | null; b: number | null; bn?: number; deals: number; rep: number;
  city: string; since: number; reviews: Review[];
};
export type Listing = {
  id: number | string; cat: string; brand?: string; model?: string; title?: string; year?: number; use?: number; unit?: string;
  city: string; price: number; prev?: number; sel: string; conf: number; serial?: boolean; takas?: boolean;
  desc: string; boost?: boolean; photos?: string[]; demo?: boolean; status?: string; createdAt?: string; [k: string]: unknown;
};
