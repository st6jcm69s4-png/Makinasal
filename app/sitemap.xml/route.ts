import { getServerSupabase } from '@/lib/supabase/server';
import { PUBLIC_INDEXING,SITE_ORIGIN,xmlEscape } from '@/lib/seo';
export async function GET(){
 if(!PUBLIC_INDEXING)return new Response('Private beta',{status:404});
 const db=getServerSupabase();if(!db)return new Response('Unavailable',{status:503});
 const {count,error}=await db.from('listings').select('id',{head:true,count:'exact'}).eq('status','active');
 if(error)return new Response('Unavailable',{status:503});
 const pages=Math.max(1,Math.ceil((count??0)/1000));
 const xml='<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Array.from({length:pages},(_,i)=>'<sitemap><loc>'+xmlEscape(SITE_ORIGIN+'/sitemaps/'+i)+'</loc></sitemap>').join('')+'</sitemapindex>';
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
