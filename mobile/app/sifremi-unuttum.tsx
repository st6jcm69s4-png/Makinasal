import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { Btn, Field } from '../components/ui';
import { AlertBox } from '../components/kit';
import { Captcha } from '../components/Captcha';
import { PASSWORD_RULES, TURNSTILE_SITE_KEY, authMessage, passwordValid } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { color } from '../lib/theme';

/** Uygulama içinde şifre sıfırlama: e-posta → e-postadaki kod → yeni şifre. Tarayıcıya gitmez. */
export default function Forgot() {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  async function send() {
    setErr(''); setInfo('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Geçerli bir e-posta yaz.');
    if (TURNSTILE_SITE_KEY && !token) return setErr('Önce güvenlik doğrulamasını tamamla.');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { captchaToken: token ?? undefined });
    setBusy(false); setToken(null); setCapKey((k) => k + 1);
    if (error) {
      const m = error.message.toLowerCase();
      return setErr(m.includes('rate') || m.includes('too many') ? 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.' : m.includes('captcha') ? 'Güvenlik doğrulaması tamamlanamadı. Kutuyu yenileyip tekrar dene.' : 'Kod gönderilemedi. Bağlantını kontrol edip tekrar dene.');
    }
    setStep('code');
    setInfo('Bu e-posta ile bir hesap varsa doğrulama kodu gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');
  }

  async function reset() {
    setErr('');
    const clean = code.replace(/\s/g, '');
    if (!verified && clean.length < 6) return setErr('E-postandaki kodu yaz.');
    if (!passwordValid(password)) return setErr('Şifre aşağıdaki koşulların hepsini karşılamalı.');
    if (password !== again) return setErr('Şifreler eşleşmiyor.');
    setBusy(true);
    // Kod bir kez doğrulanınca tüketilir; şifre hatası olursa aynı kodu yeniden denemeden devam ederiz.
    if (!verified) {
      const v = await supabase.auth.verifyOtp({ email: email.trim(), token: clean, type: 'recovery' });
      if (v.error) { setBusy(false); return setErr('Kod hatalı veya süresi dolmuş. Yeni bir kod iste.'); }
      setVerified(true);
    }
    const u = await supabase.auth.updateUser({ password });
    if (u.error) { setBusy(false); setErr(authMessage(u.error.message)); return; }
    await supabase.auth.signOut();
    setBusy(false);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <View style={s.center}>
        <View style={s.icon}><Icon name="check" size={24} color="#fff" /></View>
        <Text style={s.title}>Şifren güncellendi</Text>
        <Text style={s.p}>Yeni şifrenle giriş yapabilirsin.</Text>
        <View style={{ alignSelf: 'stretch' }}><Btn title="Giriş yap" onPress={() => router.replace('/hesap' as never)} /></View>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <Text style={s.p}>E-posta adresini yaz, sana şifre sıfırlama kodu gönderelim.</Text>
            <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
            {TURNSTILE_SITE_KEY ? <Captcha key={capKey} onToken={setToken} /> : null}
            {err ? <AlertBox variant="destructive">{err}</AlertBox> : null}
            <Btn title={busy ? 'Gönderiliyor…' : 'Kod gönder'} disabled={busy} onPress={() => void send()} />
          </>
        ) : (
          <>
            {info ? <AlertBox variant="success">{info}</AlertBox> : null}
            <Field label="E-postadaki kod" value={code} onChangeText={setCode} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} maxLength={6} textContentType="oneTimeCode" />
            <Field label="Yeni şifre" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            <View style={{ gap: 4 }}>
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <View key={r.label} style={s.rule}>
                    <Icon name={ok ? 'check-circle' : 'circle'} size={15} color={ok ? color.good : color.muted} />
                    <Text style={[s.ruleText, ok && { color: color.good }]}>{r.label}</Text>
                  </View>
                );
              })}
            </View>
            <Field label="Yeni şifre tekrar" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            {again && password !== again ? <Text style={[s.ruleText, { color: color.bad }]}>Şifreler eşleşmiyor.</Text> : null}
            {err ? <AlertBox variant="destructive">{err}</AlertBox> : null}
            <Btn title={busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'} disabled={busy} onPress={() => void reset()} />
            <Btn ghost title="Kodu yeniden gönder" onPress={() => { setStep('email'); setCode(''); setVerified(false); setErr(''); setInfo(''); }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  body: { padding: 12, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: color.bg },
  icon: { width: 48, height: 48, borderRadius: 12, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: color.ink },
  p: { color: color.ink, fontSize: 16, lineHeight: 22 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { color: color.muted, fontSize: 13 },
});
