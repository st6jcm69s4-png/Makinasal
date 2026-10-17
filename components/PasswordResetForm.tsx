'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { passwordValid } from '@/lib/accountSecurity';
import { PasswordRules } from './PasswordRules';

export function PasswordResetForm() {
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
    if (!passwordValid(password)) { setError('Şifre aşağıdaki güvenlik koşullarının tamamını karşılamalı.'); return; }
    if (password !== confirmation) { setError('Şifreler eşleşmiyor.'); return; }
    const client = getSupabase();
    if (!client) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const result = await response.json(); if(!response.ok) setError(result.error || 'Şifre güncellenemedi.'); else setDone(true);
    } catch { setError('Bağlantı kurulamadı. Tekrar dene.'); }
    finally { setBusy(false); }
  }

  if (!ready) return <div className="empty" role="status">Bağlantı doğrulanıyor…</div>;
  if (done) return <div className="panel"><h1>Şifren güncellendi</h1><p role="status">Yeni şifrenle giriş yapabilirsin.</p><a className="btn" href="/profil">Hesabıma git</a></div>;
  if (!allowed) return <div className="panel"><h1>Bağlantı geçersiz veya süresi dolmuş</h1><p>Şifre sıfırlama bağlantısını istediğin tarayıcıda aç veya yeni bir bağlantı iste.</p><a className="btn" href="/giris">Giriş sayfasına dön</a></div>;
  return <form className="panel auth" style={{ maxWidth: 420 }} onSubmit={submit}>
    <h1>Yeni şifre belirle</h1>
    <label htmlFor="new-password">Yeni şifre (en az 8 karakter)</label>
    <input id="new-password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
    <PasswordRules value={password} />
    <label htmlFor="confirm-password">Yeni şifre tekrar</label>
    <input id="confirm-password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
    {error ? <p className="err" role="alert">{error}</p> : null}
    <p><button className="btn" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}</button></p>
  </form>;
}
