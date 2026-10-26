import { CATEGORY_GROUPS, ALL_BRANDS } from './machineryCatalog';
import { PART_GROUPS } from './data';
import { tr } from './i18n';
import { supabase } from './supabase';

export type Scope = 'all' | 'sale' | 'rental' | 'jobs' | 'parts' | 'firms';
export type Suggestion = { id: string; label: string; parent: string; kind: 'section' | 'category' | 'brand' | 'part'; rank: number; score: number };

/** Büyük/küçük harf ve aksan farkını yok sayar; özgün metindeki konumları korur. */
const fold = (c: string) => c.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i');
export function foldSearch(v: string) { return fold(v); }
function folded(value: string) {
  let text = ''; const spans: { start: number; end: number }[] = []; let offset = 0;
  for (const ch of value) { const n = fold(ch); for (let i = 0; i < n.length; i++) spans.push({ start: offset, end: offset + ch.length }); text += n; offset += ch.length; }
  return { text, spans };
}
/** `label` içinde `query` ile eşleşen parçaların aralıkları (vurgulamak için). */
export function matchingRanges(label: string, query: string) {
  const needle = fold(query.trim()); const hay = folded(label); const out: { start: number; end: number }[] = [];
  if (!needle) return out;
  let from = 0; let i: number;
  while ((i = hay.text.indexOf(needle, from)) !== -1) {
    const a = hay.spans[i]?.start; const b = hay.spans[i + needle.length - 1]?.end;
    if (a !== undefined && b !== undefined) out.push({ start: a, end: b });
    from = i + needle.length;
  }
  return out;
}

export const SECTIONS = [
  { id: 'machines', label: 'İş makinesi', scopes: ['all', 'sale'] },
  { id: 'rentals', label: 'Kiralık', scopes: ['all', 'rental'] },
  { id: 'personnel', label: 'Operatör ve ustalar', scopes: ['all', 'rental'] },
  { id: 'jobs', label: 'İş talepleri', scopes: ['all', 'jobs'] },
  { id: 'parts', label: 'Yedek parça', scopes: ['all', 'parts'] },
  { id: 'requests', label: 'Parça talepleri', scopes: ['all', 'parts'] },
  { id: 'companies', label: 'Şirketler ve filolar', scopes: ['all', 'firms'] },
] as const;

type Pop = Record<string, number>;
let popCache: Promise<Pop> | null = null;
/** Arama sıklığı (üyelerin seçtiği öneriler) + ilan sayısı; açılışta bir kez yüklenir. */
export function loadPopularity(): Promise<Pop> {
  if (!popCache) {
    popCache = (async () => {
      const pop: Pop = {};
      try {
        const [hits, listings] = await Promise.all([
          supabase.rpc('suggestion_ranks'),
          supabase.from('listings').select('category,brand').eq('status', 'active').eq('moderation_status', 'approved').limit(5000),
        ]);
        for (const r of (listings.data ?? []) as { category: string; brand: string | null }[]) {
          pop['category:' + r.category] = (pop['category:' + r.category] ?? 0) + 1;
          if (r.brand) { const k = 'brand:' + r.brand; pop[k] = (pop[k] ?? 0) + 1; }
        }
        // Arama sıklığı ilan sayısından daha ağır basar.
        for (const h of (hits.data ?? []) as { id: string; hits: number | string }[]) pop[h.id] = (pop[h.id] ?? 0) + Number(h.hits) * 1000;
      } catch { /* öneriler popülerlik olmadan da çalışır */ }
      return pop;
    })();
  }
  return popCache;
}
/** Seçilen öneriyi sayar (yalnızca giriş yapmış üyeler; hata sessizce yok sayılır). */
export function recordSuggestion(id: string) {
  popCache = null;
  void supabase.rpc('hit_suggestion', { p_id: id });
}

export function searchSuggestions(query: string, pop: Pop, scope: Scope = 'all', limit = 10): Suggestion[] {
  const needle = fold(query.trim().slice(0, 200));
  if (!needle) return [];
  const out: Suggestion[] = [];
  const add = (id: string, label: string, parent: string, kind: Suggestion['kind']) => {
    const at = fold(label).indexOf(needle);
    if (at < 0) return;
    out.push({ id, label, parent, kind, rank: at === 0 ? 0 : 1, score: pop[id] ?? 0 });
  };
  for (const s of SECTIONS) if ((s.scopes as readonly string[]).includes(scope)) add('section:' + s.id, tr(s.label), tr('Bölüm'), 'section');
  if (scope !== 'firms') {
    for (const g of CATEGORY_GROUPS) {
      if (g.id === 'parts') continue;
      add('group:' + g.id, tr(g.label), tr('İş makinesi'), 'category');
      for (const c of g.categories) add('category:' + c, tr(c), tr(g.label), 'category');
    }
    if (scope === 'all' || scope === 'parts') for (const p of PART_GROUPS) add('part:' + p.id, tr(p.label), tr('Yedek parça'), 'part');
    if (scope !== 'jobs') for (const b of ALL_BRANDS) add('brand:' + b, b, tr('Marka'), 'brand');
  }
  const order = { section: 0, category: 1, part: 2, brand: 3 };
  // Önce harfle başlayanlar, sonra içinde geçenler; her grupta arama sıklığı çok olan önce.
  return out.sort((a, b) => a.rank - b.rank || b.score - a.score || order[a.kind] - order[b.kind] || a.label.localeCompare(b.label, 'tr')).slice(0, limit);
}
