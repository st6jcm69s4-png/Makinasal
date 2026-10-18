"use client";
import { useLanguage } from "@/components/LanguageProvider";

import {useEffect,useState} from "react";
import {getSupabase} from "@/lib/supabase/client";
import {money,dateLabel,type MarketPost} from "@/lib/network";
export function WorkServicesHub(){
  const { t: tr, language } = useLanguage();
const [posts,setPosts]=useState<MarketPost[]>([]),[error,setError]=useState(false),[busy,setBusy]=useState(true),[retry,setRetry]=useState(0);
useEffect(()=>{let active=true;const db=getSupabase();setBusy(true);setError(false);if(!db){setError(true);setBusy(false);return;}void db.from('market_posts').select('*').eq('kind','job').eq('status','open').order('created_at',{ascending:false}).limit(6).then(r=>{if(!active)return;setError(!!r.error);setPosts(r.data??[]);setBusy(false);});return()=>{active=false;};},[retry]);
return <><span className="eyebrow">{tr("MAKİNASAL")}</span><h1>{tr("İş ve hizmetler")}</h1><p className="lead">{tr("İşini paylaş, teklif al. Yeni işler bul veya çalışacağın şirketi seç.")}</p>
<section className="work-actions" aria-label={tr("Ne yapmak istiyorsun?")}><a className="panel" href="/is-agi/yeni?kind=job"><span>01</span><h2>{tr("İşimi yaptırmak istiyorum")}</h2><p>{tr("Nerede, ne zaman ve hangi işe ihtiyacın olduğunu yaz. Gelen teklifleri karşılaştır.")}</p><b>{tr("İşimi paylaş →")}</b></a><a className="panel" href="/isler"><span>02</span><h2>{tr("İş arıyorum")}</h2><p>{tr("Bölgendeki hafriyat, nakliye ve makine işlerini bul; fiyat teklifini gönder.")}</p><b>{tr("İşleri gör →")}</b></a><a className="panel" href="/sirketler"><span>03</span><h2>{tr("Şirket arıyorum")}</h2><p>{tr("Hizmet bölgelerine, iş alanlarına ve envanterlerine göre şirketleri incele.")}</p><b>{tr("Şirketleri gör →")}</b></a></section>
<div className="bar"><h2>{tr("Yeni iş talepleri")}</h2><a className="linkbtn" href="/isler">{tr("Tüm işler →")}</a></div>
{busy?<p role="status">{tr("İşler yükleniyor…")}</p>:error?<div className="panel" role="alert">{tr("İşler yüklenemedi. ")}<button className="btn ghost" onClick={()=>setRetry(v=>v+1)}>{tr("Tekrar dene")}</button></div>:posts.length?<div className="network-cards">{posts.map(p=><article className="panel network-card" key={p.id}><span className="sub">{[p.city,p.district].filter(Boolean).join(' / ')}</span><h2><a href={'/is-agi/ilan/'+p.id}>{p.title}</a></h2><p>{p.description.slice(0,140)}</p><span className="sub">{p.start_date?dateLabel(p.start_date, language):tr("Tarih görüşülecek")}</span><strong>{money(p.price,p.price_unit, language)}</strong><a className="linkbtn" href={'/is-agi/ilan/'+p.id}>{tr("İşi incele ve teklif ver →")}</a></article>)}</div>:<div className="panel"><p>{tr("Henüz açık iş talebi yok.")}</p><a className="btn" href="/is-agi/yeni?kind=job">{tr("İlk iş talebini paylaş")}</a></div>}
<div className="panel work-follow"><h2>{tr("İşlerini takip et")}</h2><p>{tr("Açtığın işleri ve gönderdiğin teklifleri tek yerden yönet.")}</p><a className="btn ghost" href="/is-agi/hesabim">{tr("İşlerim ve tekliflerim")}</a></div></>;
}
