"use client";
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './LanguageProvider';
import {useMarket} from './MarketProvider';
import {getSupabase} from '@/lib/supabase/client';
import {mergeMessages,olderMessagesFilter} from '@/lib/messages';
import {notificationHref} from '@/lib/notificationLinks';
type Note={id:string;title:string;body:string;url:string;read_at:string|null;created_at:string};
const PAGE_SIZE=50;
export function NotificationInbox(){
 const {language,t}=useLanguage(),{profile}=useMarket();
 const [items,setItems]=useState<Note[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[more,setMore]=useState(false),[writing,setWriting]=useState(false);
 const alive=useRef(true),busy=useRef(false),version=useRef(0);
 const uid=profile?.id;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;version.current++;};},[]);
 async function load(older=false){
  const db=getSupabase();if(!uid||!db||busy.current)return;
  busy.current=true;const requestVersion=version.current;setLoading(true);setError(false);
  try{
   let query=db.from('notifications').select('id,title,body,url,read_at,created_at').eq('user_id',uid).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(PAGE_SIZE+1);
   if(older&&items.length)query=query.or(olderMessagesFilter(items[items.length-1]));
   const {data,error}=await query;if(!alive.current||requestVersion!==version.current)return;
   if(error){setError(true);return;}
   const page=(data??[]) as Note[];setMore(page.length>PAGE_SIZE);
   setItems(cur=>mergeMessages(older?cur:[],page.slice(0,PAGE_SIZE)).reverse());
  }catch{if(alive.current&&requestVersion===version.current)setError(true);}finally{if(alive.current&&requestVersion===version.current){busy.current=false;setLoading(false);}}
 }
 useEffect(()=>{setItems([]);version.current++;busy.current=false;void load();},[uid]);
 async function mark(ids:string[]){
  const db=getSupabase();if(!uid||!db||!ids.length||writing)return;
  const requestVersion=version.current;setWriting(true);setError(false);
  try{const at=new Date().toISOString();const {error}=await db.from('notifications').update({read_at:at}).eq('user_id',uid).in('id',ids);
   if(!alive.current||requestVersion!==version.current)return;
   if(error)setError(true);else setItems(cur=>cur.map(n=>ids.includes(n.id)?{...n,read_at:n.read_at||at}:n));
  }catch{if(alive.current&&requestVersion===version.current)setError(true);}finally{if(alive.current)setWriting(false);}
 }
 if(!uid)return null;
 return <section className="panel" style={{marginTop:16}}><h2>{language==='en'?'Notification history':'Bildirim geçmişi'}</h2>
 {error?<p className="err" role="alert">{t('Bildirimler yüklenemedi. Bağlantını kontrol edip tekrar dene.')}</p>:null}
 {!items.length?(loading?<p role="status">{t('Yükleniyor…')}</p>:!error?<p>{t('Henüz bildirimin yok.')}</p>:null):<>
 <button className="btn ghost sm" disabled={writing||!items.some(n=>!n.read_at)} onClick={()=>void mark(items.filter(n=>!n.read_at).map(n=>n.id))}>{language==='en'?'Mark shown notifications as read':'Gösterilenleri okundu işaretle'}</button>
 <ul style={{listStyle:'none',padding:0}}>{items.map(n=><li key={n.id} style={{padding:'12px 0',opacity:n.read_at?0.7:1}}><a href={notificationHref(n.url)} onClick={()=>{if(!n.read_at)void mark([n.id]);}}>{t(n.title)}</a><p>{n.body}</p><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString(language==='en'?'en-GB':'tr-TR')}</time></li>)}</ul>
 {more?<button className="btn ghost sm" disabled={loading} onClick={()=>void load(true)}>{loading?t('Yükleniyor…'):t('Daha eski bildirimleri yükle')}</button>:null}</>}
 <button className="btn ghost sm" disabled={loading} onClick={()=>void load()}>{t('Yenile')}</button></section>;
}
