import { getServerSupabase } from '@/lib/supabase/server';
import { PUBLIC_INDEXING,SITE_ORIGIN,publicPages,xmlEscape } from '@/lib/seo';
export async function GET(_request:Request,{params}:{params:Promise<{page:string}>}){
 const {page}=await params;if(!PUBLIC_INDEXING||!/^\d{1,6}$/.test(page))return new Response('Not found',{status:404});
 const n=Number(page),db=getServerSupabase();if(!db)return new Response('Unavailable',{status:503});
 const {data,error}=await db.from('listings').select('id').eq('status','active').order('id').range(n*1000,n*1000+999);
 if(error)return new Response('Unavailable',{status:503});if(n>0&&!data.length)return new Response('Not found',{status:404});
 const paths=[...(n===0?publicPages.map(x=>x[0]):[]),...data.map(r=>'/ilanlar/'+r.id)];
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+xmlEscape(SITE_ORIGIN+path)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
