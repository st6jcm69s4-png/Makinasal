import {routeLabel} from './telemetry';
export async function recordEvent(event:'page_view'|'client_error'|'server_error',path:string,digest?:string){
 const data={event,route:routeLabel(path),digest:digest&&/^[a-zA-Z0-9_-]{1,80}$/.test(digest)?digest:undefined,time:new Date().toISOString()};
 if(event==='page_view')console.info(JSON.stringify({source:'makinasal',...data}));else console.error(JSON.stringify({source:'makinasal',...data}));
 // Optional official Sentry envelope endpoint; DSN is server-only. No PII or request body.
 if(event==='page_view'||!process.env.SENTRY_DSN)return;
 try{const dsn=new URL(process.env.SENTRY_DSN);if(dsn.protocol!=='https:'||!/^o\d+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname)||!/^\/\d+$/.test(dsn.pathname)||!dsn.username)return;
 const id=crypto.randomUUID().replace(/-/g,'');
 const payload=JSON.stringify({event_id:id,timestamp:Date.now()/1000,platform:'javascript',level:'error',message:event,tags:{route:data.route},fingerprint:[event,data.route,data.digest||'unknown']});
 const envelope=JSON.stringify({event_id:id,dsn:process.env.SENTRY_DSN})+'\n'+JSON.stringify({type:'event'})+'\n'+payload;
 await fetch(dsn.origin+'/api'+dsn.pathname+'/envelope/?sentry_key='+encodeURIComponent(dsn.username)+'&sentry_version=7',{method:'POST',headers:{'Content-Type':'application/x-sentry-envelope'},body:envelope,signal:AbortSignal.timeout(3000)});
 }catch{/* Logging must never break a user action. */}
}
