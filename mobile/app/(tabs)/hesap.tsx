import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import { configured, supabase } from '../../lib/supabase';

export default function Account() {
  const { session } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!configured) { setMsg('Uygulama ayarları eksik (.env dosyası).'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg('Giriş yapılamadı. E-posta veya şifreyi kontrol et.');
  }

  if (session) {
    return (
      <View style={s.screen}>
        <Text style={s.h}>Giriş yapıldı</Text>
        <Text>{session.user.email}</Text>
        <Pressable style={s.btn} onPress={() => void supabase.auth.signOut()} accessibilityRole="button"><Text style={s.btnText}>Çıkış yap</Text></Pressable>
        <Text style={s.note}>Mesajlar, favoriler ve ilan verme sonraki sürümlerde eklenecek.</Text>
      </View>
    );
  }
  return (
    <View style={s.screen}>
      <Text style={s.h}>Giriş yap</Text>
      <TextInput style={s.input} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
      {msg ? <Text style={s.err}>{msg}</Text> : null}
      <Pressable style={s.btn} disabled={busy} onPress={() => void signIn()} accessibilityRole="button"><Text style={s.btnText}>Giriş yap</Text></Pressable>
      <Text style={s.note}>Yeni kayıt şimdilik web sitesinden yapılır.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 12, backgroundColor: '#F5F5F6' },
  h: { fontSize: 22, fontWeight: '700' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  err: { color: '#b00020' },
  note: { color: '#666' },
});
