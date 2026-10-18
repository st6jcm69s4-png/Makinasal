'use client';
import { useLanguage } from "@/components/LanguageProvider";

import { readApiJson } from '@/lib/http';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { passwordValid } from '@/lib/accountSecurity';
import { PasswordRules } from './PasswordRules';

export function PasswordResetForm() {
  const { t: tr, language } = useLanguage();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    const client = getSupabase();
    if (!client) { setReady(true); return; }
    void client.auth.getUser().then(({ data }) => {
      if (live) { setAllowed(!!data.user); setReady(true); }
    }).catch(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!passwordValid(password)) { setError("Şifre aşağıdaki güvenlik koşullarının tamamını karşılamalı."); return; }
    if (password !== confirmation) { setError("Şifreler eşleşmiyor."); return; }
    const client = getSupabase();
    if (!client) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const result = await readApiJson(response); if(!response.ok) setError(result.error || 'Şifre güncellenemedi.'); else setDone(true);
    } catch { setError("Bağlantı kurulamadı. Tekrar dene."); }
    finally { setBusy(false); }
  }

  if (!ready) return <div className="empty" role="status">{tr("Bağlantı doğrulanıyor…")}</div>;
  if (done) return <div className="panel"><h1>{tr("Şifren güncellendi")}</h1><p role="status">{tr("Yeni şifrenle giriş yapabilirsin.")}</p><a className="btn" href="/profil">{tr("Hesabıma git")}</a></div>;
  if (!allowed) return <div className="panel"><h1>{tr("Bağlantı geçersiz veya süresi dolmuş")}</h1><p>{tr("Şifre sıfırlama bağlantısını istediğin tarayıcıda aç veya yeni bir bağlantı iste.")}</p><a className="btn" href="/giris">{tr("Giriş sayfasına dön")}</a></div>;
  return <form className="panel auth" style={{ maxWidth: 420 }} onSubmit={submit}>
    <h1>{tr("Yeni şifre belirle")}</h1>
    <label htmlFor="new-password">{tr("Yeni şifre (en az 8 karakter)")}</label>
    <input id="new-password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
    <PasswordRules value={password} />
    <label htmlFor="confirm-password">{tr("Yeni şifre tekrar")}</label>
    <input id="confirm-password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
    {error ? <p className="err" role="alert">{tr(error)}</p> : null}
    <p><button className="btn" disabled={busy}>{busy ? tr("Kaydediliyor…") : tr("Şifreyi güncelle")}</button></p>
  </form>;
}
