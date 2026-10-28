'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGES, LANGUAGE_COOKIE, translate, validLanguage, type Language } from '@/lib/i18n';
type LanguageContext = { language: Language; t: (value: string | null | undefined, values?: Record<string,string|number>) => string; setLanguage: (language: Language) => void };
const Context = createContext<LanguageContext>({ language:'tr', t:value=>value??'', setLanguage:()=>{} });
export function LanguageProvider({children,initialLanguage='tr'}:{children:ReactNode;initialLanguage?:Language}) {
 const [language, update] = useState<Language>(initialLanguage);
 useEffect(()=>{ document.documentElement.lang=language; },[language]);
 useEffect(()=>{try { if (!document.cookie.split(';').some(part=>part.trim().startsWith(LANGUAGE_COOKIE+'='))) { const saved=localStorage.getItem(LANGUAGE_COOKIE); if(saved==='en'||saved==='de'||saved==='tr')update(saved); } } catch { /* preference still works in memory */ }},[]);
 useEffect(()=>{const listener=(event:StorageEvent)=>{if(event.key===LANGUAGE_COOKIE&&event.newValue)update(validLanguage(event.newValue));};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);},[]);
 const setLanguage=useCallback((next:Language)=>{
  next=validLanguage(next); update(next); document.documentElement.lang=next;
  document.cookie=`${LANGUAGE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  try{localStorage.setItem(LANGUAGE_COOKIE,next);}catch{/* cookie and in-memory preference still work */}
 },[]);
 const [ask,setAsk]=useState(false);
 useEffect(()=>{try{const has=document.cookie.split(';').some(part=>part.trim().startsWith(LANGUAGE_COOKIE+'='))||localStorage.getItem(LANGUAGE_COOKIE);if(!has)setAsk(true);}catch{/* sorulmaz */}},[]);
 const choose=(l:Language)=>{setLanguage(l);setAsk(false);};
 const value=useMemo(()=>({language,setLanguage,t:(value:string|null|undefined, values?:Record<string,string|number>)=>translate(value,language,values)}),[language,setLanguage]);
 return <Context.Provider value={value}>{children}{ask?<div className="lang-welcome" role="dialog" aria-modal="true" aria-label="Language / Dil / Sprache"><div className="lang-welcome-box"><h2>Dil / Language / Sprache</h2><p>Dilini seç · Choose your language · Sprache wählen</p><div className="lang-welcome-btns">{LANGUAGES.map(l=><button key={l.code} type="button" lang={l.code} className={'btn'+(l.code==='tr'?'':' ghost')} onClick={()=>choose(l.code)}>{l.label}</button>)}</div><p className="sub">Ayarlar sayfasından istediğin zaman değiştirebilirsin · You can change this anytime in Settings · Sie können dies jederzeit in den Einstellungen ändern</p></div></div>:null}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export function Text({value}:{value:string}) {const {t}=useLanguage();return <>{t(value)}</>;}
export function LanguageSwitcher({compact=false}:{compact?:boolean}) {
 const {language,setLanguage}=useLanguage();
 return <label className={'language-switch'+(compact?' compact':'')}><span>{language==='tr'?'Dil':language==='de'?'Sprache':'Language'}</span><select aria-label={language==='tr'?'Dil seç':language==='de'?'Sprache wählen':'Choose language'} value={language} onChange={event=>setLanguage(validLanguage(event.target.value))}>{LANGUAGES.map(l=><option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}</select></label>;
}
export function SiteFooter(){const {t}=useLanguage();return <footer className="wrap" style={{padding:'28px 0 96px'}}><nav className="acts-row" aria-label={t('Yardım bağlantıları')}><a href="/destek">{t('Yardım')}</a><a href="/guven">{t('Güvenli alışveriş')}</a><a href="/hukuki/kullanim">{t('Kullanım koşulları')}</a><a href="/hukuki/kvkk">{t('KVKK aydınlatma')}</a><a href="/hukuki/ilan-kurallari">{t('İlan yayınlama kuralları')}</a><a href="/hukuki">{t('Hukuki bilgiler')}</a><a href="/hukuki/cerez">{t('Çerez tercihleri')}</a></nav><p className="sub">{t('Makinasal · Beta · Ödeme ve emanet para kabul edilmez.')}</p></footer>;}
