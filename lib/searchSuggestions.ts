import { ALL_BRANDS, CATEGORY_GROUPS } from './machineryCatalog';
import { CITIES } from './data/constants';
import { PART_GROUPS } from './parts';
import { translate, type Language } from './i18n/index';
export type SearchScope = 'all'|'sale'|'rental'|'jobs'|'parts'|'firms';
export type SearchSuggestion = { id:string; label:string; parent:string; kind:'section'|'category'|'brand'|'part'; href:string; rank:number };
/** Fold case/diacritics while retaining original UTF-16 ranges for safe React highlighting. */
function folded(value:string){
 let text='',offset=0;const spans:{start:number;end:number}[]=[];
 for(const char of value){const next=char.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');for(let i=0;i<next.length;i++)spans.push({start:offset,end:offset+char.length});text+=next;offset+=char.length;}
 return {text,spans};
}
export const foldSearch=(value:string)=>value.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
export function matchingRanges(label:string,query:string):{start:number;end:number}[]{
 const needle=foldSearch(query.trim()),hay=folded(label),ranges:{start:number;end:number}[]=[];if(!needle)return ranges;
 let from=0,index:number;while((index=hay.text.indexOf(needle,from))!==-1){const start=hay.spans[index]?.start,end=hay.spans[index+needle.length-1]?.end;if(start!==undefined&&end!==undefined)ranges.push({start,end});from=index+needle.length;}
 return ranges;
}
const SECTIONS=[
 {id:'machines',label:'İş makinesi',href:'/ilanlar?cat=group%3Amachines',scopes:['all','sale']},
 {id:'rentals',label:'Kiralık',href:'/kiralik',scopes:['all','rental']},
 {id:'personnel',label:'Operatör ve ustalar',href:'/kiralik?bolum=personel',scopes:['all','rental']},
 {id:'jobs',label:'İş talepleri',href:'/isler',scopes:['all','jobs']},
 {id:'services',label:'İş ve hizmetler',href:'/is-ve-hizmetler',scopes:['all','jobs']},
 {id:'parts',label:'Yedek parça',href:'/yedek-parca',scopes:['all','parts']},
 {id:'requests',label:'Parça talepleri',href:'/parca-talepleri',scopes:['all','parts']},
 {id:'companies',label:'Şirketler ve filolar',href:'/sirketler',scopes:['all','firms']},
] as const;
export function searchSuggestions(query:string,{language='tr',scope='all',city='',limit=10}:{language?:Language;scope?:SearchScope;city?:string;limit?:number}={}):SearchSuggestion[]{
 const needle=foldSearch(query.trim().slice(0,200));if(!needle)return [];
 const tr=(s:string)=>translate(s,language),out:SearchSuggestion[]=[];
 const url=(route:string,params:Record<string,string>={})=>{const [path,existing]=route.split('?');const p=new URLSearchParams(existing);for(const[k,v]of Object.entries(params))if(v)p.set(k,v);if((CITIES as readonly string[]).includes(city))p.set('city',city);return path+(p.size?'?'+p.toString():'');};
 const add=(item:Omit<SearchSuggestion,'rank'>)=>{const label=foldSearch(item.label),at=label.indexOf(needle);if(at>=0)out.push({...item,rank:at===0?0:1});};
 for(const s of SECTIONS)if((s.scopes as readonly string[]).includes(scope))add({id:'section:'+s.id,label:tr(s.label),parent:tr('Bölüm'),kind:'section',href:url(s.href)});
 const route=scope==='rental'?'/kiralik':scope==='jobs'?'/isler':scope==='parts'?'/yedek-parca':'/ilanlar';
 if(scope!=='firms'){
  for(const group of CATEGORY_GROUPS){
   if(group.id==='parts')continue;
   add({id:'group:'+group.id,label:tr(group.label),parent:tr('İş makinesi'),kind:'category',href:url(route,{[scope==='parts'?'equipment':'cat']:'group:'+group.id})});
   for(const category of group.categories){add({id:'category:'+category,label:tr(category),parent:tr(group.label),kind:'category',href:url(route,{[scope==='parts'?'equipment':'cat']:category})});}
  }
  if(scope==='all'||scope==='parts')for(const part of PART_GROUPS)add({id:'part:'+part.id,label:tr(part.label),parent:tr('Yedek parça'),kind:'part',href:url('/yedek-parca',{part:part.id})});
  if(scope!=='jobs')for(const brand of ALL_BRANDS)add({id:'brand:'+brand,label:brand,parent:tr('Marka'),kind:'brand',href:url(route,{brand})});
 }
 const order={section:0,category:1,part:2,brand:3};
 return out.sort((a,b)=>a.rank-b.rank||order[a.kind]-order[b.kind]||a.label.localeCompare(b.label,language==='en'?'en':'tr')).slice(0,Math.max(1,Math.min(limit,20)));
}
