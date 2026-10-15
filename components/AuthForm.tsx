'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';

function trError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-posta veya şifre hatalı.';
  if (m.includes('already registered')) return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
  if (m.includes('email not confirmed')) return 'E-postanı henüz onaylamadın. Gelen kutundaki bağlantıya tıkla.';
  if (m.includes('password') && m.includes('6')) return 'Şifre en az 6 karakter olmalı.';
  if (m.includes('rate limit')) return 'Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.';
  return msg;
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <div className="panel">
        <b>Supabase bağlantısı yok.</b> Proje klasöründe <code>.env.local</code> dosyası oluşturup
        <code> NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> değerlerini yaz, sonra
        <code> npm run dev</code>'i yeniden başlat.
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setInfo('');
    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) setError(trError(error.message));
      else if (!data.session) setInfo('Kayıt alındı. E-postana gelen onay bağlantısına tıkla, sonra giriş yap.');
      else { router.push('/ilanlar'); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(trError(error.message));
      else { router.push('/ilanlar'); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <form className="panel auth" onSubmit={submit} style={{ maxWidth: 420 }}>
      <h2>{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</h2>
      {mode === 'register' ? (
        <>
          <label htmlFor="name">Ad soyad</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </>
      ) : null}
      <label htmlFor="email">E-posta</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <label htmlFor="pw">Şifre</label>
      <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {error ? <div className="alert low" role="alert">{error}</div> : null}
      {info ? <div className="alert high" role="status">{info}</div> : null}
      <p><button className="btn" type="submit" disabled={busy}>{busy ? 'Bekleyin…' : mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}</button></p>
      <p className="meta" style={{ marginBottom: 0 }}>
        {mode === 'login' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
        <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo(''); }}>
          {mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}
        </button>
      </p>
    </form>
  );
}
