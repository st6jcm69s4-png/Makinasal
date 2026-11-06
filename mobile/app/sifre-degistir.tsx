import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { Btn, Field } from '../components/ui';
import { AlertBox } from '../components/kit';
import { PASSWORD_RULES, passwordValid } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { color } from '../lib/theme';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!passwordValid(password)) return setErr('Şifre aşağıdaki koşulların hepsini karşılamalı.');
    if (password !== again) return setErr('Şifreler eşleşmiyor.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const m = (error.message + ' ' + (error.code ?? '')).toLowerCase();
      if (m.includes('same_password') || m.includes('different from the old')) setErr('Yeni şifre eskisiyle aynı olamaz.');
      else if (m.includes('reauth')) setErr('Güvenlik için önce çıkış yapıp yeniden giriş yapman gerekiyor, sonra tekrar dene.');
      else if (m.includes('weak') || m.includes('pwned') || m.includes('password')) setErr('Bu şifre çok yaygın veya zayıf. Başka bir şifre dene.');
      else setErr('Şifre değiştirilemedi. Bağlantını kontrol edip tekrar dene.');
      return;
    }
    setPassword(''); setAgain(''); setDone(true);
  }

  if (done) {
    return (
      <View style={s.center}>
        <View style={s.icon}><Icon name="check" size={24} color="#fff" /></View>
        <Text style={s.title}>Şifren güncellendi</Text>
        <Text style={s.p}>Bir sonraki girişte yeni şifreni kullan.</Text>
        <View style={{ alignSelf: 'stretch' }}><Btn title="Tamam" onPress={() => router.back()} /></View>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
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
        <Btn title={busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'} disabled={busy} onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  body: { padding: 12, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: color.bg },
  icon: { width: 48, height: 48, borderRadius: 12, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: color.ink },
  p: { textAlign: 'center', color: color.ink, fontSize: 16, lineHeight: 22 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { color: color.muted, fontSize: 13 },
});
