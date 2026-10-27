import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { PlainText, Text } from './LText';
import { Btn } from './ui';
import { color } from '../lib/theme';
import { fetchProviders, type AuthProviders } from '../lib/auth';
import { LEGAL_VERSION } from '../lib/legalTexts';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Adresteki ?a=b ve #a=b parametrelerini birlikte okur. */
function parseParams(url: string) {
  const out: Record<string, string> = {};
  const raw = url.split(/[?#]/).slice(1).join('&');
  for (const part of raw.split('&')) {
    const [k, v = ''] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

/** Giriş sonrası kullanım koşulları kabul kaydını hesaba işler (yoksa). */
async function recordTerms(fullName?: string) {
  const { data } = await supabase.auth.getUser();
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (!meta.terms_version) { patch.terms_version = LEGAL_VERSION; patch.terms_accepted_at = new Date().toISOString(); }
  if (fullName && !meta.full_name) patch.full_name = fullName;
  if (Object.keys(patch).length) await supabase.auth.updateUser({ data: patch });
}

/** Google ve Apple ile giriş. Yalnızca Supabase'de açık olan sağlayıcılar gösterilir. */
export function SocialAuth() {
  const [p, setP] = useState<AuthProviders>({ google: false, apple: false });
  const [appleOk, setAppleOk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void fetchProviders().then(setP);
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleOk).catch(() => setAppleOk(false));
  }, []);

  async function google() {
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error || !data.url) throw new Error(error?.message ?? 'no url');
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return;
      const q = parseParams(res.url);
      const code = q.code;
      const at = q.access_token;
      const rt = q.refresh_token;
      if (code) { const r = await supabase.auth.exchangeCodeForSession(code); if (r.error) throw r.error; }
      else if (at && rt) { const r = await supabase.auth.setSession({ access_token: at, refresh_token: rt }); if (r.error) throw r.error; }
      else throw new Error('no token');
      await recordTerms();
    } catch { Alert.alert('Google ile giriş', 'Giriş tamamlanamadı. Tekrar dene.'); }
    finally { setBusy(false); }
  }

  async function apple() {
    setBusy(true);
    try {
      const c = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!c.identityToken) throw new Error('no token');
      const r = await supabase.auth.signInWithIdToken({ provider: 'apple', token: c.identityToken });
      if (r.error) throw r.error;
      const name = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ');
      await recordTerms(name || undefined);
    } catch (e) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple ile giriş', 'Giriş tamamlanamadı. Tekrar dene.');
    } finally { setBusy(false); }
  }

  const showApple = p.apple && appleOk;
  if (!p.google && !showApple) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.or}><View style={s.line} /><PlainText style={s.orText}>VEYA</PlainText><View style={s.line} /></View>
      {showApple ? <Btn title="Apple ile devam et" disabled={busy} onPress={() => void apple()} /> : null}
      {p.google ? <Btn ghost title="Google ile devam et" disabled={busy} onPress={() => void google()} /> : null}
      <Text style={s.note}>Devam ederek Kullanım koşullarını ve KVKK aydınlatma metnini okuduğunu kabul edersin.</Text>
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
        <Text style={s.link} onPress={() => router.push('/hukuki/kullanim' as never)}>Kullanım koşulları</Text>
        <Text style={s.link} onPress={() => router.push('/hukuki/kvkk' as never)}>KVKK aydınlatma</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: color.line },
  orText: { color: color.muted, fontSize: 12, letterSpacing: 1 },
  note: { color: color.muted, fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
  link: { color: color.accent, fontWeight: '600', fontSize: 13 },
});
