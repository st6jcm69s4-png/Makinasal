"use client";
import { useEffect,useState } from "react";
import { CITIES } from "@/lib/data/constants";
import type { Listing } from "@/lib/data/types";
import { getSupabase } from "@/lib/supabase/client";
import { categoryValues,categoryLabel,canonicalBrand } from "@/lib/machineryCatalog";
import { partGroupsFor,partGroupLabel,validPartGroup,partsSearchText } from "@/lib/parts";
import { rowToListing } from "@/lib/dbListings";
import { CategoryOptions,BrandField } from "./CatalogControls";
import { ListingCard } from "./ListingCard";
export function SparePartsBrowser(){
 const [equipment,setEquipment]=useState(""),[group,setGroup]=useState(""),[brand,setBrand]=useState(""),[city,setCity]=useState(""),[q,setQ]=useState(""),[page,setPage]=useState(0),[ready,setReady]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0),[list,setList]=useState<Listing[]>([]),[total,setTotal]=useState(0);
 useEffect(()=>{const p=new URLSearchParams(window.location.search);const eq=p.get('equipment')||'';if(categoryValues(eq).length)setEquipment(eq);const g=p.get('part')||'';if(partGroupsFor(eq).some(x=>x.id===g))setGroup(g);setBrand((p.get('brand')||'').slice(0,100));const c=p.get('city')||'';if(CITIES.includes(c as typeof CITIES[number]))setCity(c);setQ((p.get('q')||'').slice(0,100));setReady(true);},[]);
 useEffect(()=>{if(!ready)return;let live=true;setBusy(true);setError('');const db=getSupabase();if(!db){setError('İlanlar şu anda yüklenemiyor.');setBusy(false);return;}
 const p=new URLSearchParams();if(equipment)p.set('equipment',equipment);if(group)p.set('part',group);if(brand)p.set('brand',brand);if(city)p.set('city',city);if(q)p.set('q',q);window.history.replaceState(null,'','/yedek-parca'+(p.size?'?'+p.toString():''));
 let query=db.from('listings').select('*,listing_photos(path,position)',{count:'exact'}).eq('status','active').in('category',['Yedek parça','Lastik ve jant']).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*24,page*24+23);
 if(equipment)query=query.in('equipment_category',categoryValues(equipment));if(group==='tires')query=query.or('part_group.eq.tires,category.eq.Lastik ve jant');else if(group)query=query.eq('part_group',group);
 if(brand.trim())query=query.ilike('brand',canonicalBrand(brand).replace(/[%_\\]/g,''));if(city)query=query.eq('city',city);
 const search=partsSearchText(q);if(search)query=query.or(`title.ilike.%${search}%,spec.ilike.%${search}%,compat.ilike.%${search}%`);
 void query.then(result=>{if(!live)return;if(result.error){setError('Parça ilanları yüklenemedi. Tekrar dene.');setList([]);setTotal(0);}else{setList((result.data??[]).map(row=>rowToListing(row as Parameters<typeof rowToListing>[0],path=>db.storage.from('listing-photos').getPublicUrl(path).data.publicUrl)));setTotal(result.count??0);}setBusy(false);});return()=>{live=false;};
 },[ready,equipment,group,brand,city,q,page,retry]);
 const pickEquipment=(value:string)=>{setEquipment(value);setGroup('');setBrand('');setPage(0);};
 const newParams=new URLSearchParams({cat:group==='tires'?'Lastik ve jant':'Yedek parça'});if(equipment&&!equipment.startsWith('group:'))newParams.set('equipment',equipment);if(group)newParams.set('part',group);
 return <><div className="network-heading"><div><span className="eyebrow">MAKİNASAL</span><h1>Yedek parça</h1><p className="lead">Makine veya aracını seç, ihtiyacın olan parçayı bul.</p></div><a className="btn" href={'/ilan-ver?'+newParams.toString()}>Parça ilanı ver</a></div>
 <nav className="parts-path" aria-label="Parça seçimi"><button onClick={()=>pickEquipment('')}>Tüm parçalar</button>{equipment&&<><span>/</span><button onClick={()=>{setGroup('');setPage(0);}}>{categoryLabel(equipment)}</button></>}{group&&<><span>/</span><span>{partGroupLabel(group)}</span></>}</nav>
 <section className="panel parts-selection" aria-label="Parça filtreleri"><div className="parts-steps">
 <label><span>1 · Makine veya araç</span><select value={equipment} onChange={e=>pickEquipment(e.target.value)}><option value="">Tüm makineler ve araçlar</option><CategoryOptions includeParts={false} allowGroups /></select></label>
 <label><span>2 · Aradığın parça</span><select value={group} onChange={e=>{setGroup(e.target.value);setPage(0);}}><option value="">Tüm parça grupları</option>{partGroupsFor(equipment).map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
 </div><div className="network-filters"><label>Parça adı veya numarası<input type="search" maxLength={100} value={q} placeholder="Pompa, filtre, A10VO71…" onChange={e=>{setQ(e.target.value);setPage(0);}}/></label><BrandField category={equipment} value={brand} onChange={v=>{setBrand(v);setPage(0);}} label="Marka"/><label>İl<select value={city} onChange={e=>{setCity(e.target.value);setPage(0);}}><option value="">Tüm iller</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select></label></div><button className="btn ghost sm" onClick={()=>{pickEquipment('');setCity('');setQ('');}}>Filtreleri temizle</button></section>
 <div className="bar parts-results-heading"><h2>{equipment?categoryLabel(equipment):'Tüm makine ve araçlar'} · {group?partGroupLabel(group):'Yedek parçalar'}</h2><span role="status">{busy?'Yükleniyor…':`${total} ilan`}</span></div>
 {error?<div className="panel" role="alert">{error}<button className="btn ghost" onClick={()=>setRetry(v=>v+1)}>Tekrar dene</button></div>:busy?<div className="panel" role="status">Seçimine uygun parçalar yükleniyor…</div>:list.length?<div className="grid">{list.map(l=><ListingCard key={l.id} l={l}/>)}</div>:<div className="panel network-empty"><h3>Bu seçimde henüz ilan yok</h3><p>Makine türünü veya parça grubunu değiştirebilir, aradığın parça için teklif isteyebilirsin.</p><a className="btn" href="/is-agi/yeni?kind=part_request">Aradığım parçayı paylaş</a></div>}
 {total>24&&<nav className="network-actions" aria-label="Parça sonuç sayfaları"><button className="btn ghost" disabled={busy||page===0} onClick={()=>setPage(v=>v-1)}>Önceki</button><span>{page+1} / {Math.ceil(total/24)}</span><button className="btn ghost" disabled={busy||(page+1)*24>=total} onClick={()=>setPage(v=>v+1)}>Sonraki</button></nav>}
 </>;
}
