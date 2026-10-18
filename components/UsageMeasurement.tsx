"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {routeLabel} from '@/lib/telemetry';
import {CONSENT_KEY} from './CookiePreferences';
export function UsageMeasurement(){const path=usePathname()||'/';const [enabled,setEnabled]=useState(false);useEffect(()=>{const read=()=>{try{const next=localStorage.getItem(CONSENT_KEY)==='measurement';if(!next&&document.querySelector('script[data-domain]'))location.reload();setEnabled(next);}catch{setEnabled(false);}};read();window.addEventListener('makinasal-consent',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('makinasal-consent',read);window.removeEventListener('storage',read);};},[]);
 useEffect(()=>{if(!enabled)return;const domain=process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;let script:HTMLScriptElement|undefined;if(domain&&/^[a-z0-9.-]+$/i.test(domain)){script=document.createElement('script');script.defer=true;script.dataset.domain=domain;script.src='https://plausible.io/js/script.js';document.head.appendChild(script);}return()=>{script?.remove();};},[enabled]);
 useEffect(()=>{if(!enabled)return;const timer=setTimeout(()=>{void fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'page_view',path:routeLabel(path)}),keepalive:true}).catch(()=>{});},500);return()=>clearTimeout(timer);},[path,enabled]);return null;}
