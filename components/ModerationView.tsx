'use client';
import {useAdminAccess} from './useAdminAccess';
import { useLanguage } from "@/components/LanguageProvider";

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';
type PendingListing = { id: string; title: string; city: string; price: number; created_at: string };
type ServiceReq = { id: string; kind: string; note: string | null; city: string | null; status: string; created_at: string; listing_id: string | null; listing_title: string | null; full_name: string | null; phone: string | null; email: string | null };
type Report = { id: string; ticket: number; listing_id: string | null; reason: string; verified: boolean; status: string };
export function ModerationView() {
  const { t: tr, language } = useLanguage();

 const { profile, authReady, reload } = useMarket();
 const {admin,checked}=useAdminAccess(profile?.id);
 const [listings,setListings] = useState<PendingListing[]>([]); const [reports,setReports] = useState<Report[]>([]); const [requests,setRequests] = useState<ServiceReq[]>([]);
 const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
 const load = useCallback(async()=>{
  const client=getSupabase(); if(!client||!admin)return;
  const [l,r]=await Promise.all([
   client.from('listings').select('id,title,city,price,created_at').eq('moderation_status','pending').neq('status','removed').order('created_at'),
   client.from('reports').select('id,ticket,listing_id,reason,verified,status').eq('status','open').order('created_at'),
  ]);
  if(l.error||r.error){setError("Moderasyon kurulumu henüz tamamlanmadı veya erişim izni yok.");return;}
  setListings(l.data as PendingListing[]);setReports(r.data as Report[]);setError('');
  const sr=await client.rpc('admin_service_requests');if(!sr.error&&Array.isArray(sr.data))setRequests(sr.data as ServiceReq[]);
 },[admin]);
 useEffect(()=>{void load();},[load]);
 async function action(table:'listings'|'reports'|'service_requests',id:string,values:Record<string,unknown>){
  if(busy)return; const client=getSupabase();if(!client)return;setBusy(true);setError('');
  try {const {data,error}=await client.from(table).update(values).eq('id',id).select('id').maybeSingle();if(error||!data){setError("İşlem kaydedilemedi. Yetkini ve bağlantını kontrol et.");return;}await load();await reload();}
  catch{setError("Bağlantı kurulamadı. Tekrar dene.");}finally{setBusy(false);}
 }
 if(!authReady||!checked)return <div className="empty">{tr("Yetki kontrol ediliyor…")}</div>;
 if(!admin)return <div className="panel"><h1>{tr("Yönetici erişimi gerekli")}</h1><p>{tr("Bu bölüm yalnızca yetkilendirilmiş moderatörler içindir.")}</p><a className="btn" href="/giris">{tr("Giriş yap")}</a></div>;
 return <><h1>{tr("Moderasyon")}</h1>{error?<p className="err" role="alert">{tr(error)}</p>:null}<button className="btn ghost" disabled={busy} onClick={()=>void load()}>{tr("Yenile")}</button>
 <section className="panel" style={{marginTop:16}}><h2>{tr("İnceleme bekleyen ilanlar")}</h2>{!listings.length?<p>{tr("Bekleyen ilan yok.")}</p>:listings.map(l=><div className="mine" key={l.id}><div><a href={`/ilanlar/${l.id}`}>{l.title}</a><p>{l.city} · {Number(l.price).toLocaleString('tr-TR')} ₺</p></div><div className="acts-row"><button disabled={busy} className="btn" onClick={()=>void action('listings',l.id,{moderation_status:'approved'})}>{tr("Onayla")}</button><button disabled={busy} className="btn ghost" onClick={()=>void action('listings',l.id,{moderation_status:'rejected',status:'paused'})}>{tr("Reddet")}</button></div></div>)}</section>
 <section className="panel" style={{marginTop:16}}><h2>{tr("Açık şikayetler")}</h2>{!reports.length?<p>{tr("Açık şikayet yok.")}</p>:reports.map(r=><div className="mine" key={r.id}><div><b>{tr("ŞK-")}{r.ticket}</b><p>{r.reason}</p>{r.listing_id?<a href={`/ilanlar/${r.listing_id}`}>{tr("İlanı aç")}</a>:null}</div><div className="acts-row"><button disabled={busy} className="btn" onClick={()=>void action('reports',r.id,{verified:true,status:'resolved'})}>{tr("Şikayeti doğrula")}</button><button disabled={busy} className="btn ghost" onClick={()=>void action('reports',r.id,{verified:false,status:'dismissed'})}>{tr("Geçersiz kapat")}</button></div></div>)}</section>
 <section className="panel" style={{marginTop:16}}><h2>{tr("Hizmet talepleri")}</h2>{!requests.length?<p>{tr("Talep yok.")}</p>:requests.map(q=><div className="mine" key={q.id}><div><b>{tr(({finans:'Finansman',nakliye:'Nakliye',ekspertiz:'Ekspertiz'} as Record<string,string>)[q.kind]??q.kind)}</b> · {q.city??''}{q.listing_id?<> · <a href={`/ilanlar/${q.listing_id}`}>{q.listing_title??q.listing_id}</a></>:null}<p>{q.full_name??'—'} · {q.phone??'—'} · {q.email??'—'}</p>{q.note?<p>{q.note}</p>:null}<p className="sub">{new Date(q.created_at).toLocaleString(language==='en'?'en-GB':'tr-TR')} · {tr(q.status==='new'?'Yeni':q.status==='contacted'?'Görüşüldü':'Kapandı')}</p></div><div className="acts-row">{q.status==='new'?<button className="btn ghost sm" disabled={busy} onClick={()=>void action('service_requests',q.id,{status:'contacted'})}>{tr("Görüşüldü")}</button>:null}{q.status!=='closed'?<button className="btn ghost sm" disabled={busy} onClick={()=>void action('service_requests',q.id,{status:'closed'})}>{tr("Kapat")}</button>:null}</div></div>)}</section></>;
}
