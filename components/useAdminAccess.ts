'use client';
import {useEffect,useState} from 'react';
import {getSupabase} from '@/lib/supabase/client';
/** Navigation convenience only. Database RLS remains the authority for every admin action. */
export function useAdminAccess(userId:string|undefined){
 const [result,setResult]=useState<{id:string|undefined;admin:boolean;checked:boolean}>({id:undefined,admin:false,checked:false});
 useEffect(()=>{
  let live=true;const client=getSupabase();
  if(!userId||!client){setResult({id:userId,admin:false,checked:true});return;}
  setResult({id:userId,admin:false,checked:false});
  const check=async()=>{try{
   const {data,error}=await client.auth.getUser();
   if(error||data.user?.id!==userId){if(live)setResult({id:userId,admin:false,checked:true});return;}
   const admin=data.user.app_metadata?.role==='admin';
   const {data:cached}=await client.auth.getSession();
   if(cached.session?.user.id===userId&&(cached.session.user.app_metadata?.role==='admin')!==admin){
    const refreshed=await client.auth.refreshSession();
    if(refreshed.error||refreshed.data.user?.id!==userId){if(live)setResult({id:userId,admin:false,checked:true});return;}
   }
   if(live)setResult({id:userId,admin,checked:true});
  }catch{if(live)setResult({id:userId,admin:false,checked:true});}};
  void check();window.addEventListener('focus',check);return()=>{live=false;window.removeEventListener('focus',check);};
 },[userId]);
 return result.id===userId?result:{id:userId,admin:false,checked:false};
}
