'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { authError, safeAuthNext } from '@/lib/auth';

type Mode = 'login' | 'register' | 'reset';
export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const supabase = getSupabase();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('auth_error')) {
      setError('Onay bağlantısı geçersiz veya süresi dolmuş. Tekrar giriş yap ya da yeni bir şifre sıfırlama bağlantısı iste.');
    }
  }, []);
  function switchMode(value: Mode) { setMode(value); setError(''); setInfo(''); setPassword(''); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const cleanEmail = email.trim();
      const next = safeAuthNext(new URLSearchParams(window.location.search).get('next'));
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', mode === 'reset' ? '/sifre-yenile' : next);
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: callback.toString() });
        if (error) setError(authError(error.message));
        else setInfo('Bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et. Bağlantıyı bu tarayıcıda aç.');
      } else if (mode === 'register') {
        if (name.trim().length < 2) { setError('Ad soyadını en az 2 karakter olarak gir.'); return; }
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: callback.toString() },
        });
        if (error) setError(authError(error.message));
        else if (!data.session) setInfo('Kayıt isteği alındı. E-postana gelen onay bağlantısını bu tarayıcıda aç. Mevcut hesabın varsa giriş yapabilirsin.');
        else { router.push(next); router.refresh(); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setError(authError(error.message));
        else { router.push(next); router.refresh(); }
      }
    } catch { setError('Bağlantı kurulamadı. Tekrar dene.'); }
    finally { setBusy(false); }
  }

  if (!supabase) return <div className="panel" role="status">Hesap hizmeti şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.</div>;
  return <form className="panel auth" onSubmit={submit} style={{ maxWidth: 420 }}>
    <h2>{mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Hesap oluştur' : 'Şifremi unuttum'}</h2>
    {mode === 'register' ? <><label htmlFor="name">Ad soyad</label><input id="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" /></> : null}
    <label htmlFor="email">E-posta</label>
    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
    {mode !== 'reset' ? <><label htmlFor="pw">Şifre{mode === 'register' ? ' (en az 8 karakter)' : ''}</label>
      <input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></> : null}
    {error ? <div className="alert low" role="alert">{error}</div> : null}
    {info ? <div className="alert high" role="status">{info}</div> : null}
    <p><button className="btn" type="submit" disabled={busy}>{busy ? 'Bekleyin…' : mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Kayıt ol' : 'Sıfırlama bağlantısı gönder'}</button></p>
    {mode === 'login' ? <p><button type="button" className="btn ghost" disabled={busy} onClick={() => switchMode('reset')}>Şifremi unuttum</button></p> : null}
    <p className="meta" style={{ marginBottom: 0 }}>
      {mode === 'login' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
      <button type="button" className="btn ghost" disabled={busy} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}</button>
    </p>
  </form>;
}
