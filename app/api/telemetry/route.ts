import {readBoundedText} from '@/lib/http';
import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,authRequest} from '@/lib/authRequest';
import {recordEvent} from '@/lib/observability';
// A bounded best-effort process limiter; database write limits are a separate migration.
const recent=new Map<string,{at:number;n:number}>();
export async function POST(request:NextRequest){
 const fail=(status:number)=>new Response(null,{status});
 if(!sameOrigin(request))return fail(403);if(Number(request.headers.get('content-length'))>512)return fail(413);
 try{const text=await readBoundedText(request,512);if(text.length>512)return fail(413);const body=JSON.parse(text);
 if(!['page_view','client_error'].includes(body.event)||typeof body.path!=='string')return fail(400);
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});const db=authRequest(request,response);const {data,error}=await db.auth.getUser();if(error||!data.user)return fail(401);
 const now=Date.now();if(recent.size>2000)for(const [key,v] of recent){if(now-v.at>60000)recent.delete(key);}if(recent.size>2500)return fail(429);
 const uid=data.user.id,v=recent.get(uid);if(v&&now-v.at<60000){if(v.n>=30)return fail(429);v.n++;}else recent.set(uid,{at:now,n:1});
 await recordEvent(body.event,body.path,typeof body.digest==='string'?body.digest:undefined);return response;
 }catch{return fail(400);}
}
