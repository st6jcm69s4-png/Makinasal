"use client";
import {useState,useEffect} from 'react';
import {useLanguage} from './LanguageProvider';
export const CONSENT_KEY='makinasal-consent-v1';
export function CookiePreferences({banner=false}:{banner?:boolean}){
 const {language}=useLanguage();const en=language!=='tr';
 const [ready,setReady]=useState(false),[choice,setChoice]=useState('');
 useEffect(()=>{try{setChoice(localStorage.getItem(CONSENT_KEY)||'');}catch{}setReady(true);},[]);
 function save(value:string){try{localStorage.setItem(CONSENT_KEY,value);}catch{}setChoice(value);window.dispatchEvent(new Event('makinasal-consent'));}
 if(!ready||(banner&&choice))return null;
 return <section className={banner?'cookie-banner panel':'panel'} aria-label={en?'Cookie preferences':'Çerez tercihleri'}>
 <h2>{en?'Cookie preferences':'Çerez tercihleri'}</h2>
 <p>{en?'Essential storage keeps your session, language and favourites working. Optional measurement is off by default. No advertising cookies are used.':'Zorunlu depolama oturum, dil ve favorilerin çalışmasını sağlar. İsteğe bağlı ölçüm varsayılan olarak kapalıdır. Reklam çerezi kullanılmaz.'}</p>
 <p className="sub">{en?'Measurement preference applies to anonymous usage measurement when a service is enabled. You can change it here any time.':'Ölçüm tercihi, hizmet etkinleştirildiğinde anonim kullanım ölçümü için geçerlidir. Tercihini burada değiştirebilirsin.'}</p>
 <div className="acts-row"><button className="btn ghost" onClick={()=>save('essential')}>{en?'Essential only':'Yalnızca zorunlu'}</button><button className="btn ghost" onClick={()=>save('measurement')}>{en?'Allow measurement':'Ölçüme izin ver'}</button><a href="/hukuki/cerez">{en?'Details':'Ayrıntılar'}</a></div>
 {!banner&&choice?<p role="status">{en?'Current preference: ':'Mevcut tercih: '}{choice==='measurement'?(en?'Measurement allowed':'Ölçüme izin verildi'):(en?'Essential only':'Yalnızca zorunlu')}</p>:null}</section>;
}
