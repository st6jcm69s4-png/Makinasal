'use client';
import { readApiJson } from '@/lib/http';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { authError, safeAuthNext } from '@/lib/auth';
import { capitalizeName, formatPersonName, validRegion } from '@/lib/profile';
import { RegionFields } from './RegionFields';
import { PasswordRules } from './PasswordRules';
import { passwordValid, normalizePhone, publicAuthOptions, type AuthOptions } from '@/lib/accountSecurity';

type Mode = 'login' | 'register' | 'reset';
export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [region, setRegion] = useState({ city: '', district: '' });
  const [skipRegion, setSkipRegion] = useState(false);
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [options, setOptions] = useState<AuthOptions | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const supabase = getSupabase();
  useEffect(() => {
    let active = true;
    void fetch('/api/auth/options', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { if (active) setOptions(publicAuthOptions(data)); }).catch(() => { if (active) setOptions({google:false,apple:false,phone:false,emailConfirmation:false,registration:false}); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(c => Math.max(0,c-1)),1000); return () => clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('auth_error')) {
      setError('Onay bağlantısı geçersiz veya süresi dolmuş. Tekrar giriş yap ya da yeni bir şifre sıfırlama bağlantısı iste.');
    }
  }, []);
  function switchMode(value: Mode) { setMode(value); setError(''); setInfo(''); setPassword(''); setConfirmation(''); setConfirmationPending(false); }

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
        if (!validRegion(region.city, region.district)) { setError('Lütfen seçtiğin ile ait bir ilçe seç.'); return; }
        if (!passwordValid(password)) { setError('Şifren aşağıdaki güvenlik koşullarının tamamını karşılamalı.'); return; }
        if (password !== confirmation) { setError('Şifreler eşleşmiyor.'); return; }
        if (!normalizePhone(phone)) { setError('Geçerli bir Türkiye cep telefonu numarası gir.'); return; }
        const response = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:formatPersonName(name),email:cleanEmail,password,phone,city:region.city,district:region.district,next }) });
        const result = await readApiJson(response);
        if (!response.ok) setError(result.error || 'Kayıt tamamlanamadı.');
        else { setConfirmationPending(true); setPassword(''); setConfirmation(''); setCooldown(60); setInfo('Kayıt isteğin alındı. E-postandaki onay bağlantısını aç; ardından telefonuna gelen SMS koduyla doğrulamayı tamamla.'); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setError(authError(error.message));
        else { window.location.assign(next); }
      }
    } catch { setError('Bağlantı kurulamadı. Tekrar dene.'); }
    finally { setBusy(false); }
  }

  async function social(provider: 'google' | 'apple') {
    if (!supabase || busy || !options?.[provider]) return;
    setBusy(true); setError('');
    try {
      const callback = new URL('/auth/callback',window.location.origin);
      const verify = new URL('/hesap-dogrula',window.location.origin); verify.searchParams.set('next',safeAuthNext(new URLSearchParams(window.location.search).get('next'))); callback.searchParams.set('next',verify.pathname+verify.search);
      const { error } = await supabase.auth.signInWithOAuth({provider,options:{redirectTo:callback.toString()}});
      if (error) { setError(authError(error.message)); setBusy(false); }
    } catch { setError('Giriş başlatılamadı. Tekrar dene.'); setBusy(false); }
  }
  async function resendEmail() {
    if (!supabase || busy || cooldown || !email.trim() || !options?.emailConfirmation) return;
    setBusy(true); setError('');
    try {
      const callback = new URL('/auth/callback',window.location.origin); callback.searchParams.set('next','/hesap-dogrula');
      const { error } = await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:callback.toString()}});
      if (error) setError(authError(error.message)); else { setInfo('Hesabın onay bekliyorsa yeni bağlantı gönderildi. Spam klasörünü de kontrol et.'); setCooldown(60); }
    } catch { setError('E-posta gönderilemedi. Tekrar dene.'); } finally { setBusy(false); }
  }
  if (!supabase) return <div className="panel" role="status">Hesap hizmeti şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.</div>;
  return <form className="panel auth" onSubmit={submit} style={{ maxWidth: 420 }}>
    <h2>{mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Hesap oluştur' : 'Şifremi unuttum'}</h2>
    {mode !== 'reset' && <div className="social-auth"><button type="button" className="btn ghost" disabled={busy || !options?.google} onClick={() => void social('google')}>Google ile giriş yap</button><button type="button" className="btn ghost" disabled={busy || !options?.apple} onClick={() => void social('apple')}>Apple ile giriş yap</button>{options && (!options.google || !options.apple) && <p className="sub">Gri görünen giriş seçenekleri şu anda kullanılamıyor.</p>}<span>veya e-posta ile devam et</span></div>}
    {mode === 'register' && options && !options.registration && <p className="auth-notice" role="status">E-posta ve SMS doğrulaması açılana kadar yeni kayıt alınamıyor. Mevcut hesabınla giriş yapabilirsin.</p>}
    {mode === 'register' ? <><label htmlFor="name">Ad soyad</label><input id="name" value={name} onChange={e => setName(capitalizeName(e.target.value))} onBlur={() => setName(formatPersonName(name))} autoCapitalize="words" required minLength={2} maxLength={80} autoComplete="name" /></> : null}
    <label htmlFor="email">E-posta</label>
    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
    {mode === 'register' && <><label htmlFor="signup-phone">Cep telefonu</label><input id="signup-phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} maxLength={24} placeholder="05XX XXX XX XX" onChange={e => setPhone(e.target.value)} /><small className="sub">E-posta onayından sonra SMS koduyla doğrulanır.</small></>}
    {mode !== 'reset' && <><label htmlFor="pw">Şifre{mode === 'register' ? ' (en az 8 karakter)' : ''}</label>
      <input id="pw" type={showPassword ? "text" : "password"} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      <button type="button" className="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</button>
      {mode === 'register' && <><PasswordRules value={password} /><label htmlFor="signup-confirmation">Şifre tekrar</label><input id="signup-confirmation" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></>}
    </>}
    {mode === 'register' && <section className="registration-region" aria-label="Bölge seçimi">
      <h3>Size daha iyi hizmet verebilmemiz için bölgenizi seçin</h3>
      <p className="sub">İsteğe bağlıdır. Daha sonra Profil → Bilgilerim bölümünden değiştirebilirsin.</p>
      {skipRegion ? <><p className="sub">Bölge seçimi atlandı.</p><button type="button" className="btn ghost sm" onClick={() => setSkipRegion(false)}>Bölge seç</button></> : <><RegionFields {...region} onChange={setRegion} /><button type="button" className="btn ghost sm" onClick={() => { setRegion({ city: '', district: '' }); setSkipRegion(true); }}>Şimdilik atla</button></>}
    </section>}
    {error ? <div className="alert low" role="alert">{error}</div> : null}
    {info ? <div className="alert high" role="status">{info}</div> : null}
    <p><button className="btn" type="submit" disabled={busy || (mode === 'register' && (!options?.registration || confirmationPending))}>{busy ? 'Bekleyin…' : mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Kayıt ol' : 'Sıfırlama bağlantısı gönder'}</button></p>
    {mode === 'register' && confirmationPending && <p><button type="button" className="btn ghost" disabled={busy || cooldown > 0} onClick={() => void resendEmail()}>Onay e-postasını yeniden gönder{cooldown ? ` (${cooldown} sn)` : ''}</button></p>}
    {mode === 'login' ? <p><button type="button" className="btn ghost" disabled={busy} onClick={() => switchMode('reset')}>Şifremi unuttum</button></p> : null}
    <p className="meta" style={{ marginBottom: 0 }}>
      {mode === 'login' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
      <button type="button" className="btn ghost" disabled={busy} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}</button>
    </p>
  </form>;
}
