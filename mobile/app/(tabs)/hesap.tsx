import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ReferralBox } from '../../components/ReferralBox';
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
      <ScrollView style={{ backgroundColor: '#F5F5F6' }} contentContainerStyle={s.screen}>
        <Text style={s.h}>Hesabım</Text>
        <Text>{session.user.email}</Text>
        <Pressable style={s.btn} onPress={() => router.push('/ilan-ver')} accessibilityRole="button"><Text style={s.btnText}>İlan ver</Text></Pressable>
        <Pressable style={s.btn} onPress={() => router.push('/ilanlarim')} accessibilityRole="button"><Text style={s.btnText}>İlanlarım</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/bildirimler')} accessibilityRole="button"><Text style={s.btnGhostText}>Bildirimler</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/kayitli-aramalar')} accessibilityRole="button"><Text style={s.btnGhostText}>Kayıtlı aramalar</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/karsilastir')} accessibilityRole="button"><Text style={s.btnGhostText}>Karşılaştırma</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/profil-duzenle')} accessibilityRole="button"><Text style={s.btnGhostText}>Profili düzenle</Text></Pressable>
        <ReferralBox />
        <Pressable style={s.btnGhost} onPress={() => void supabase.auth.signOut()} accessibilityRole="button"><Text style={s.btnGhostText}>Çıkış yap</Text></Pressable>
        <Text style={s.note}>Daha fazla özellik yakında.</Text>
      </ScrollView>
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
  screen: { padding: 20, gap: 12, flexGrow: 1, backgroundColor: '#F5F5F6' },
  h: { fontSize: 22, fontWeight: '700' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#6B1E2E', fontWeight: '600' },
  err: { color: '#b00020' },
  note: { color: '#666' },
});
