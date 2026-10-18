"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { readApiJson } from "@/lib/http";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { normalizePhone, publicAuthOptions, type AuthOptions } from "@/lib/accountSecurity";
import { authError, safeAuthNext } from "@/lib/auth";
import { useMarket } from "./MarketProvider";
export function AccountVerification() {
  const { t: tr, language } = useLanguage();

 const { reloadProfile } = useMarket();
 const [user,setUser]=useState<User|null>(null), [options,setOptions]=useState<AuthOptions|null>(null), [loading,setLoading]=useState(true), [phone,setPhone]=useState(""), [code,setCode]=useState(""), [sent,setSent]=useState(false), [busy,setBusy]=useState(false), [cooldown,setCooldown]=useState(0), [error,setError]=useState(""), [info,setInfo]=useState("");
 useEffect(()=>{let active=true;const db=getSupabase();void Promise.all([db?.auth.getUser(),fetch('/api/auth/options',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();})]).then(([result,settings])=>{if(!active)return;const u=result?.data.user??null;setUser(u);if(u?.phone_confirmed_at) void db?.rpc('sync_contact_verification').then(({error})=>{if(!error)void reloadProfile();});setOptions(publicAuthOptions(settings));setPhone(u?.phone||String(u?.user_metadata.contact_phone||""));}).catch(()=>{if(active)setError("Hesap bilgilerin yüklenemedi. Sayfayı yenileyerek tekrar dene.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(v=>Math.max(0,v-1)),1000);return()=>clearTimeout(t);},[cooldown]);
 const confirmedPhone=!!user?.phone_confirmed_at && !!user.phone;
 async function send() {
  const db=getSupabase(), normalized=normalizePhone(phone);if(!db||busy||cooldown||!options?.phone)return;
  if(!normalized){setError("Geçerli bir Türkiye cep telefonu numarası gir.");return;}
  setBusy(true);setError("");setInfo("");
  try{const {error}=await db.auth.updateUser({phone:normalized});if(error)throw error;setPhone(normalized);setSent(true);setCooldown(60);setInfo("SMS kodu gönderildi. Kodu aşağıya gir.");}catch(e){setError(authError(e instanceof Error?e.message:""));}finally{setBusy(false);}
 }
 async function verify() {
  const db=getSupabase();if(!db||busy||!sent)return;if(!/^\d{6}$/.test(code)){setError("SMS'teki 6 haneli kodu gir.");return;}
  setBusy(true);setError("");
  try{const {error}=await db.auth.verifyOtp({phone:normalizePhone(phone),token:code,type:'phone_change'});if(error)throw error;
   const {error:syncError}=await db.rpc('sync_contact_verification');if(syncError)throw new Error('Doğrulama kaydı yenilenemedi. Sayfayı yenile.');
   const {data,error:readError}=await db.auth.getUser();if(readError)throw readError;setUser(data.user);setCode("");setSent(false);setInfo("Telefonun doğrulandı.");await reloadProfile();
  }catch(e){setError(authError(e instanceof Error?e.message:""));}finally{setBusy(false);}
 }
 if(loading)return <p role="status">{tr("Hesap bilgileri yükleniyor…")}</p>;
 if(!user)return <div className="panel"><h1>{tr("Hesabını doğrula")}</h1><p>{tr("E-postandaki onay bağlantısını aç veya hesabına giriş yap.")}</p><a className="btn" href="/giris?next=%2Fhesap-dogrula">{tr("Giriş yap")}</a>{error&&<p role="alert">{tr(error)}</p>}</div>;
 const emailConfirmed=!!user.email_confirmed_at && options?.emailConfirmation;
 const complete=emailConfirmed&&confirmedPhone;
 return <><h1>{tr("Hesap güvenliği")}</h1><p className="lead">{tr("E-posta ve telefonunun sana ait olduğunu doğrula.")}</p>
 <div className="verification-grid"><section className="panel"><h2>{tr("E-posta")}</h2><p>{user.email||tr("E-posta bulunamadı")}</p><strong>{emailConfirmed?tr("Doğrulandı"):options?.emailConfirmation?tr("Onay bekleniyor"):tr("E-posta doğrulaması şu anda kullanılamıyor.")}</strong><p className="sub">{tr("E-posta bağlantısını açtıktan sonra buradan telefonunu doğrulayabilirsin.")}</p></section>
 <section className="panel"><h2>{tr("Telefon")}</h2><p><strong>{confirmedPhone?tr("Doğrulandı"):tr("SMS doğrulaması gerekli")}</strong></p>
 {!confirmedPhone&&<><label htmlFor="verify-phone">{tr("Cep telefonu")}</label><input id="verify-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} value={phone} disabled={busy||sent} onChange={e=>setPhone(e.target.value)} placeholder={tr("05XX XXX XX XX")}/>
 <button className="btn" type="button" disabled={busy||cooldown>0||!options?.phone} onClick={()=>void send()}>{sent?tr("Kodu yeniden gönder"):tr("SMS kodu gönder")}{cooldown?` (${cooldown} sn)`:''}</button>
 {sent&&<><button className="btn ghost" type="button" disabled={busy} onClick={()=>{setSent(false);setCode("");}}>{tr("Numarayı değiştir")}</button><label htmlFor="sms-code">{tr("SMS doğrulama kodu")}</label><input id="sms-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><button className="btn" type="button" disabled={busy} onClick={()=>void verify()}>{tr("Kodu doğrula")}</button></>}
 {!options?.phone&&<p className="sub">{tr("SMS doğrulaması şu anda kullanılamıyor. Daha sonra tekrar deneyebilirsin.")}</p>}</>}
 {confirmedPhone&&<p>{user.phone}</p>}</section></div>
 {error&&<p className="err" role="alert">{tr(error)}</p>}{info&&<p role="status">{tr(info)}</p>}
 {complete?<button className="btn" onClick={()=>window.location.assign(safeAuthNext(new URLSearchParams(window.location.search).get('next')))}>{tr("Doğrulama tamamlandı, devam et")}</button>:<a className="btn ghost" href="/profil">{tr("Profilime dön")}</a>}</>;
}
