// Prototipteki veri tablolarını TypeScript dosyalarına aktarır (tek seferlik).
const fs=require('fs'),vm=require('vm');
const s=fs.readFileSync('public/prototip.html','utf8');
const sc=s.slice(s.indexOf('<script>'),133887+0);
const a=sc.indexOf('var MACH='), b=sc.indexOf('var S={'), c=sc.indexOf('var me='), d=sc.indexOf('var L=['), e=sc.indexOf('var DEMO_PHOTOS=');
const ctx={};vm.createContext(ctx);
vm.runInContext(sc.slice(a,b)+sc.slice(b,c)+sc.slice(d,e)+';this.out={MACH,PARTS,CATS,KMCATS,CITIES,COORDS,LIM,S,L}',ctx);
const o=ctx.out;
const j=x=>JSON.stringify(x,null,1);
fs.writeFileSync('lib/data/constants.ts',`// Otomatik üretildi (scripts/extract-data.js). Elle düzenleyebilirsiniz.
export const MACHINE_CATEGORIES = ${j(o.MACH)} as const;
export const PART_CATEGORIES = ${j(o.PARTS)} as const;
export const CATEGORIES = [...MACHINE_CATEGORIES, ...PART_CATEGORIES] as const;
export type Category = (typeof CATEGORIES)[number];
/** Kullanım birimi km olan kategoriler (diğerleri çalışma saati) */
export const KM_CATEGORIES: ReadonlySet<string> = new Set(${j(Object.keys(o.KMCATS))});
export const CITIES: string[] = ${j(o.CITIES)};
/** Şehir merkezi koordinatları [enlem, boylam] (yaklaşık) */
export const COORDS: Record<string, [number, number]> = ${j(o.COORDS)};
export const LIMITS = ${j(o.LIM)} as const;
`);
fs.writeFileSync('lib/data/types.ts',`export type Review = { who: string; role: string; rating: number; text: string; date: string; tags: string[] };
export type Seller = {
  name: string; type: 'Kurumsal' | 'Bireysel'; ver: boolean; prem?: boolean;
  s: number | null; b: number | null; bn?: number; deals: number; rep: number;
  city: string; since: number; reviews: Review[];
};
export type Listing = {
  id: number; cat: string; brand?: string; model?: string; title?: string; year?: number; use?: number; unit?: string;
  city: string; price: number; prev?: number; sel: string; conf: number; serial?: boolean; takas?: boolean;
  desc: string; boost?: boolean; [k: string]: unknown;
};
`);
fs.writeFileSync('lib/data/sellers.ts',`import type { Seller } from './types';\nexport const SELLERS: Record<string, Seller> = ${j(o.S)};\n`);
fs.writeFileSync('lib/data/listings.ts',`import type { Listing } from './types';\nexport const LISTINGS: Listing[] = ${j(o.L)};\n`);
console.log(o.L.length,'ilan',Object.keys(o.S).length,'satıcı');
console.log([...new Set(o.L.flatMap(Object.keys))].join(','));
