"use client";
import {useEffect,useRef,useState} from 'react';
type Turnstile={render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
declare global {interface Window {turnstile?:Turnstile}}
const SITE_KEY=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export function AuthCaptcha({onToken}:{onToken:(token:string)=>void}){const host=useRef<HTMLDivElement>(null),callback=useRef(onToken);callback.current=onToken;const [failed,setFailed]=useState(false);
 useEffect(()=>{if(!SITE_KEY)return;let active=true,id:string|undefined;let attempts=0;function render(){if(!active||!host.current)return;if(window.turnstile){id=window.turnstile.render(host.current,{sitekey:SITE_KEY,callback:(value:string)=>callback.current(value),'expired-callback':()=>callback.current(''),'error-callback':()=>{callback.current('');setFailed(true);}});}else if(attempts++<100)setTimeout(render,100);else setFailed(true);}
 let script=document.getElementById('makinasal-turnstile') as HTMLScriptElement|null;if(!script){script=document.createElement('script');script.id='makinasal-turnstile';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;document.head.appendChild(script);}render();return()=>{active=false;if(id)window.turnstile?.remove(id);};},[]);
 if(!SITE_KEY)return null;return <div><div ref={host}/>{failed?<p role="alert">CAPTCHA · <button type="button" className="btn ghost sm" onClick={()=>location.reload()}>↻</button></p>:null}</div>;
}
