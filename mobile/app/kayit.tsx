import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { Btn, Field, Hatch, Select } from '../components/ui';
import { AlertBox } from '../components/kit';
import { PickerModal } from '../components/PickerModal';
import { Captcha } from '../components/Captcha';
import { SocialAuth } from '../components/SocialAuth';
import { CITIES } from '../lib/data';
import { districtsFor, formatPersonName, validRegion } from '../lib/regions';
import { PASSWORD_RULES, SIGNUP_OPEN, TURNSTILE_SITE_KEY, authMessage, normalizePhone, passwordValid } from '../lib/auth';
import { LEGAL_VERSION } from '../lib/legalTexts';
import { supabase, SITE_URL } from '../lib/supabase';
import { color, font, radius } from '../lib/theme';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'city' | 'district'>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setErr('');
    const cleanName = formatPersonName(name);
    const cleanPhone = normalizePhone(phone);
    if (cleanName.length < 2) return setErr('Ad soyadını yaz.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Geçerli bir e-posta yaz.');
    if (!cleanPhone) return setErr('Telefon numarasını 05XX XXX XX XX biçiminde yaz.');
    if (!validRegion(city, district)) return setErr('İl ve ilçeni seç.');
    if (!passwordValid(password)) return setErr('Şifre aşağıdaki koşulların hepsini karşılamalı.');
    if (!accepted) return setErr('Kullanım koşullarını kabul etmelisin.');
    if (!token) return setErr('Güvenlik doğrulamasını tamamla.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: {
        captchaToken: token,
        data: { full_name: cleanName, city, district, contact_phone: cleanPhone, terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: `${SITE_URL.replace(/\/$/, '')}/auth/callback?next=/hesap-dogrula`,
      },
    });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); setToken(null); return; }
    if (data.session) { router.replace('/hesap-dogrula' as never); return; }
    setSent(true);
  }

  if (!SIGNUP_OPEN) {
    return (
      <View style={s.center}>
        <View style={s.icon}><Icon name="user-plus" size={24} color="#fff" /></View>
        <PlainText style={s.title}>KAYIT YAKINDA</PlainText>
        <Text style={s.p}>Yeni üyelik kısa süre içinde açılacak. Hesabın varsa giriş yapabilir, uygulamayı misafir olarak gezebilirsin.</Text>
        <View style={{ alignSelf: 'stretch' }}><Btn title="Giriş yap" onPress={() => router.navigate('/hesap')} /></View>
      </View>
    );
  }
  if (sent) {
    return (
      <View style={s.center}>
        <View style={[s.icon, { backgroundColor: color.good }]}><Icon name="mail" size={24} color="#fff" /></View>
        <PlainText style={s.title}>E-POSTANI KONTROL ET</PlainText>
        <Text style={s.p}>{`${email.trim()} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya dokununca hesabın etkinleşir. Gelmediyse spam klasörüne bak.`}</Text>
        <View style={{ alignSelf: 'stretch' }}><Btn title="Giriş ekranına dön" onPress={() => router.navigate('/hesap')} /></View>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <PlainText style={s.headTitle}>ÜYE OL</PlainText>
          <Text style={s.headSub}>İlan ver, mesajlaş, teklif al. Ücretsiz.</Text>
        </View>
        <Hatch height={7} />
        <View style={s.body}>
          <Field label="Ad soyad" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05XX XXX XX XX" textContentType="telephoneNumber" />
          <Select label="İl" value={city} onPress={() => setSheet('city')} />
          <Select label="İlçe" value={district} onPress={() => (city ? setSheet('district') : setErr('Önce il seç.'))} />
          <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
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
          <Pressable style={s.check} onPress={() => setAccepted((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
            <View style={[s.box, accepted && { backgroundColor: color.accent, borderColor: color.accent }]}>{accepted ? <Icon name="check" size={15} color="#fff" /> : null}</View>
            <Text style={s.checkText}>Kullanım koşullarını ve KVKK aydınlatma metnini okudum, kabul ediyorum.</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={s.link} onPress={() => router.push('/hukuki/kullanim' as never)}>Kullanım koşulları</Text>
            <Text style={s.link} onPress={() => router.push('/hukuki/kvkk' as never)}>KVKK aydınlatma</Text>
          </View>
          {TURNSTILE_SITE_KEY ? <Captcha onToken={setToken} /> : <AlertBox variant="warning" title="Güvenlik doğrulaması ayarlı değil">.env dosyasında EXPO_PUBLIC_TURNSTILE_SITE_KEY yok.</AlertBox>}
          {err ? <AlertBox variant="destructive">{err}</AlertBox> : null}
          <Btn title={busy ? 'Kaydediliyor…' : 'Üye ol'} disabled={busy} onPress={() => void submit()} />
          <SocialAuth />
          <Pressable onPress={() => router.navigate('/hesap')} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 6 }}><Text style={s.link}>Zaten hesabın var mı? Giriş yap</Text></Pressable>
        </View>
      </ScrollView>
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(c) => { setCity(c); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={districtsFor(city).map((d) => ({ value: d, label: d }))} onPick={setDistrict} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: color.bg },
  icon: { width: 48, height: 48, borderRadius: radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.labelBold, fontSize: 28, color: color.ink, letterSpacing: 0.6 },
  p: { textAlign: 'center', color: color.ink, fontSize: 16, lineHeight: 22 },
  head: { backgroundColor: color.navy, padding: 16, gap: 2 },
  headTitle: { color: '#fff', fontFamily: font.labelBold, fontSize: 28, letterSpacing: 0.6 },
  headSub: { color: color.onNavy, fontSize: 14 },
  body: { padding: 12, gap: 12 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { color: color.muted, fontSize: 13 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderWidth: 1.5, borderColor: color.muted, borderRadius: 3, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkText: { flex: 1, color: color.ink, fontSize: 14, lineHeight: 19 },
  link: { color: color.accent, fontWeight: '600', fontSize: 13.5 },
});
