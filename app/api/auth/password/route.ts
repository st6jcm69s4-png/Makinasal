import { NextRequest, NextResponse } from "next/server";
import { authRequest, sameOrigin } from "@/lib/authRequest";
import { passwordValid } from "@/lib/accountSecurity";
import { authError } from "@/lib/auth";
export async function POST(request: NextRequest) {
 const fail = (error: string,status=400) => NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
 if (!sameOrigin(request)) return fail("İstek doğrulanamadı.",403);
 try {
 const raw = await request.text(); if(raw.length>4096) return fail("İstek çok uzun.");
 const { password } = JSON.parse(raw); if(typeof password!=="string" || !passwordValid(password)) return fail("Şifre tüm güvenlik koşullarını karşılamalı.");
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}}), db=authRequest(request,response);
 const {data,error:sessionError}=await db.auth.getUser(); if(sessionError||!data.user) return fail("Önce giriş yap veya şifre sıfırlama bağlantısını aç.",401);
 const {error}=await db.auth.updateUser({password}); if(error)return fail(authError(error.message));return response;
 }catch{return fail("Şifre güncellenemedi.",503);}
}
