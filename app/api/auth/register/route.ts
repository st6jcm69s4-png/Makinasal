import { NextRequest, NextResponse } from "next/server";
import { authRequest, sameOrigin } from "@/lib/authRequest";
import { getAuthOptions } from "@/lib/authOptions";
import { passwordValid, normalizePhone } from "@/lib/accountSecurity";
import { formatPersonName, validRegion } from "@/lib/profile";
import { authError, safeAuthNext } from "@/lib/auth";
export async function POST(request: NextRequest) {
 const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
 if (!sameOrigin(request)) return fail("İstek doğrulanamadı.", 403);
 try {
  if (Number(request.headers.get("content-length")) > 16000) return fail("İstek çok uzun.");
  const raw = await request.text(); if (raw.length > 16000) return fail("İstek çok uzun.");
  const data = JSON.parse(raw), name = formatPersonName(String(data.name ?? "")), phone = normalizePhone(String(data.phone ?? ""));
  const email = String(data.email ?? "").trim(), password = String(data.password ?? ""), city = String(data.city ?? ""), district = String(data.district ?? "");
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !phone || !validRegion(city, district)) return fail("Ad, e-posta, telefon ve bölge bilgilerini kontrol et.");
  if (!passwordValid(password)) return fail("Şifre en az 8 karakter, büyük harf, küçük harf, rakam ve özel karakter içermeli.");
  const options = await getAuthOptions();
  if (!options.registration) return fail("Yeni kayıt için e-posta ve SMS doğrulaması henüz kullanıma açılmadı. Mevcut hesabınla giriş yapabilirsin.",503);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  const callback = new URL("/auth/callback", request.url), destination = new URL("/hesap-dogrula", request.url);
  destination.searchParams.set("next",safeAuthNext(data.next)); callback.searchParams.set("next",destination.pathname+destination.search);
  const { error } = await authRequest(request,response).auth.signUp({ email,password, options: { data: { full_name:name,city,district,contact_phone:phone }, emailRedirectTo:callback.toString() } });
  if (error) return fail(authError(error.message)); return response;
 } catch { return fail("Kayıt tamamlanamadı. Daha sonra tekrar dene.",503); }
}
