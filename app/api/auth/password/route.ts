import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authRequest, sameOrigin } from "@/lib/authRequest";
import { passwordValid } from "@/lib/accountSecurity";
import { authError } from "@/lib/auth";
import { readBoundedText } from "@/lib/http";

/** Son kimlik doğrulama (giriş, sıfırlama bağlantısı, kod) en fazla bu kadar eski olabilir. */
const RECENT_AUTH_SECONDS = 15 * 60;

/** Oturum anahtarındaki kimlik doğrulama kayıtları (amr): yöntem ve zaman. */
function authMethods(accessToken: string | undefined): { method: string; timestamp: number }[] {
 try {
  const part = accessToken?.split(".")[1];
  if (!part) return [];
  const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { amr?: unknown };
  return Array.isArray(json.amr) ? json.amr.filter((a): a is { method: string; timestamp: number } => !!a && typeof a === "object" && typeof (a as { method?: unknown }).method === "string" && typeof (a as { timestamp?: unknown }).timestamp === "number") : [];
 } catch { return []; }
}

/*
 * Şifre değiştirme / sıfırlama.
 * Şifre yalnızca şu durumlarda değişir:
 *  - oturum şifre sıfırlama bağlantısıyla açıldıysa (amr: recovery), ya da
 *  - kullanıcı son 15 dakika içinde kimliğini doğruladıysa, ya da
 *  - istekte mevcut şifre (currentPassword) gönderildiyse ve doğruysa.
 * Böylece ele geçirilmiş eski bir oturumla şifre değiştirilemez.
 */
export async function POST(request: NextRequest) {
 const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
 if (!sameOrigin(request)) return fail("İstek doğrulanamadı.", 403);
 try {
  let raw = "";
  try { raw = await readBoundedText(request, 4096); } catch { return fail("İstek çok uzun.", 413); }
  const body = JSON.parse(raw) as { password?: unknown; currentPassword?: unknown };
  const password = body.password, currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (typeof password !== "string" || !passwordValid(password)) return fail("Şifre tüm güvenlik koşullarını karşılamalı.");
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }), db = authRequest(request, response);
  const { data, error: sessionError } = await db.auth.getUser();
  if (sessionError || !data.user) return fail("Önce giriş yap veya şifre sıfırlama bağlantısını aç.", 401);

  const { data: s } = await db.auth.getSession();
  const amr = authMethods(s.session?.access_token);
  const now = Math.floor(Date.now() / 1000);
  const viaRecovery = amr.some((a) => a.method === "recovery" || a.method === "otp" || a.method === "magiclink");
  const recent = amr.some((a) => now - a.timestamp <= RECENT_AUTH_SECONDS);
  if (!viaRecovery && !recent) {
   if (!currentPassword || !data.user.email) return fail("Güvenliğin için mevcut şifreni gir ya da şifre sıfırlama bağlantısı iste.", 403);
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if (!url || !key) return fail("Şifre güncellenemedi.", 503);
   const check = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
   const login = await check.auth.signInWithPassword({ email: data.user.email, password: currentPassword });
   if (login.error || login.data.user?.id !== data.user.id) return fail(/rate|too many/i.test(login.error?.message ?? "") ? "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene." : "Mevcut şifre yanlış.", 403);
   // Supabase "Secure password change" açık: şifre, mevcut şifreyle yeni açılan (taze) oturumdan değiştirilir
   const fresh = await check.auth.updateUser({ password });
   await check.auth.signOut({ scope: "local" }).catch(() => undefined);
   if (fresh.error) return fail(authError(fresh.error.message));
   await db.auth.signOut();
   return response;
  }

  const { error } = await db.auth.updateUser({ password });
  if (error) return fail(authError(error.message));
  await db.auth.signOut();
  return response;
 } catch { return fail("Şifre güncellenemedi.", 503); }
}
