'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';
type PendingListing = { id: string; title: string; city: string; price: number; created_at: string };
type Report = { id: string; ticket: number; listing_id: string | null; reason: string; verified: boolean; status: string };
export function ModerationView() {
 const { profile, authReady, reload } = useMarket();
 const [admin,setAdmin] = useState(false); const [checked,setChecked] = useState(false);
 const [listings,setListings] = useState<PendingListing[]>([]); const [reports,setReports] = useState<Report[]>([]);
 const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
 useEffect(() => { setChecked(false); const client=getSupabase(); let live=true;
  if (!client || !profile) { setAdmin(false); setChecked(true); return; }
  void client.auth.getUser().then(({data})=>{ if(live){setAdmin(data.user?.app_metadata?.role==='admin');setChecked(true);} }).catch(()=>{if(live)setChecked(true);});
  return ()=>{live=false;};
 },[profile?.id]);
 const load = useCallback(async()=>{
  const client=getSupabase(); if(!client||!admin)return;
  const [l,r]=await Promise.all([
   client.from('listings').select('id,title,city,price,created_at').eq('moderation_status','pending').neq('status','removed').order('created_at'),
   client.from('reports').select('id,ticket,listing_id,reason,verified,status').eq('status','open').order('created_at'),
  ]);
  if(l.error||r.error){setError('Moderasyon kurulumu henüz tamamlanmadı veya erişim izni yok.');return;}
  setListings(l.data as PendingListing[]);setReports(r.data as Report[]);setError('');
 },[admin]);
 useEffect(()=>{void load();},[load]);
 async function action(table:'listings'|'reports',id:string,values:Record<string,unknown>){
  if(busy)return; const client=getSupabase();if(!client)return;setBusy(true);setError('');
  try {const {data,error}=await client.from(table).update(values).eq('id',id).select('id').maybeSingle();if(error||!data){setError('İşlem kaydedilemedi. Yetkini ve bağlantını kontrol et.');return;}await load();await reload();}
  catch{setError('Bağlantı kurulamadı. Tekrar dene.');}finally{setBusy(false);}
 }
 if(!authReady||!checked)return <div className="empty">Yetki kontrol ediliyor…</div>;
 if(!admin)return <div className="panel"><h1>Yönetici erişimi gerekli</h1><p>Bu bölüm yalnızca yetkilendirilmiş moderatörler içindir.</p><a className="btn" href="/giris">Giriş yap</a></div>;
 return <><h1>Moderasyon</h1>{error?<p className="err" role="alert">{error}</p>:null}<button className="btn ghost" disabled={busy} onClick={()=>void load()}>Yenile</button>
 <section className="panel" style={{marginTop:16}}><h2>İnceleme bekleyen ilanlar</h2>{!listings.length?<p>Bekleyen ilan yok.</p>:listings.map(l=><div className="mine" key={l.id}><div><a href={`/ilanlar/${l.id}`}>{l.title}</a><p>{l.city} · {Number(l.price).toLocaleString('tr-TR')} ₺</p></div><div className="acts-row"><button disabled={busy} className="btn" onClick={()=>void action('listings',l.id,{moderation_status:'approved'})}>Onayla</button><button disabled={busy} className="btn ghost" onClick={()=>void action('listings',l.id,{moderation_status:'rejected',status:'paused'})}>Reddet</button></div></div>)}</section>
 <section className="panel" style={{marginTop:16}}><h2>Açık şikayetler</h2>{!reports.length?<p>Açık şikayet yok.</p>:reports.map(r=><div className="mine" key={r.id}><div><b>ŞK-{r.ticket}</b><p>{r.reason}</p>{r.listing_id?<a href={`/ilanlar/${r.listing_id}`}>İlanı aç</a>:null}</div><div className="acts-row"><button disabled={busy} className="btn" onClick={()=>void action('reports',r.id,{verified:true,status:'resolved'})}>Şikayeti doğrula</button><button disabled={busy} className="btn ghost" onClick={()=>void action('reports',r.id,{verified:false,status:'dismissed'})}>Geçersiz kapat</button></div></div>)}</section></>;
}
