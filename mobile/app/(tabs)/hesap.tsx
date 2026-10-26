import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/LText';
import { router } from 'expo-router';
import { ReferralBox } from '../../components/ReferralBox';
import { useApp } from '../../lib/AppContext';
import { configured, supabase, SITE_URL } from '../../lib/supabase';
import { openWeb } from '../../lib/web';

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

  async function forgot() {
    const mail = email.trim();
    if (!mail) { setMsg('Önce e-posta adresini yaz, sonra "Şifremi unuttum"a bas.'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${SITE_URL.replace(/\/$/, '')}/auth/callback?next=/sifre-yenile` });
    setBusy(false);
    if (error) { setMsg('Şifre sıfırlama bağlantısı buradan gönderilemedi. Web sitesinden dene.'); openWeb('/giris'); }
    else setMsg('Bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');
  }

  if (session) {
    return (
      <ScrollView style={{ backgroundColor: '#F6F5F3' }} contentContainerStyle={s.screen}>
        <Text style={s.h}>Hesabım</Text>
        <Text>{session.user.email}</Text>
        <Pressable style={s.btn} onPress={() => router.push('/ilan-ver')} accessibilityRole="button"><Text style={s.btnText}>İlan ver</Text></Pressable>
        <Pressable style={s.btn} onPress={() => router.push('/ilanlarim')} accessibilityRole="button"><Text style={s.btnText}>İlanlarım</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/bildirimler')} accessibilityRole="button"><Text style={s.btnGhostText}>Bildirimler</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/kayitli-aramalar')} accessibilityRole="button"><Text style={s.btnGhostText}>Kayıtlı aramalar</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/karsilastir')} accessibilityRole="button"><Text style={s.btnGhostText}>Karşılaştırma</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/profil-duzenle')} accessibilityRole="button"><Text style={s.btnGhostText}>Profili düzenle</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/ag/hesabim' as never)} accessibilityRole="button"><Text style={s.btnGhostText}>İş ağı hesabım</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/yedek-parca')} accessibilityRole="button"><Text style={s.btnGhostText}>Yedek parça</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/harita')} accessibilityRole="button"><Text style={s.btnGhostText}>İl haritası</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/odemelerim')} accessibilityRole="button"><Text style={s.btnGhostText}>Ödemelerim</Text></Pressable>
        <Pressable style={s.btnGhost} onPress={() => router.push('/ayarlar')} accessibilityRole="button"><Text style={s.btnGhostText}>Ayarlar, yardım ve hukuki bilgiler</Text></Pressable>
        <ReferralBox />
        <Pressable style={s.btnGhost} onPress={() => void supabase.auth.signOut()} accessibilityRole="button"><Text style={s.btnGhostText}>Çıkış yap</Text></Pressable>
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
      <Pressable style={s.btnGhost} onPress={() => void forgot()} accessibilityRole="button"><Text style={s.btnGhostText}>Şifremi unuttum</Text></Pressable>
      <Pressable style={s.btnGhost} onPress={() => openWeb('/giris')} accessibilityRole="button"><Text style={s.btnGhostText}>Kayıt ol (web sitesi)</Text></Pressable>
      <Pressable style={s.btnGhost} onPress={() => router.push('/yedek-parca')} accessibilityRole="button"><Text style={s.btnGhostText}>Yedek parça ara</Text></Pressable>
      <Pressable style={s.btnGhost} onPress={() => router.push('/destek')} accessibilityRole="button"><Text style={s.btnGhostText}>Yardım ve hukuki bilgiler</Text></Pressable>
      <Text style={s.note}>Yeni kayıt şimdilik web sitesinden yapılır.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { padding: 20, gap: 12, flexGrow: 1, backgroundColor: '#F6F5F3' },
  h: { fontSize: 22, fontWeight: '700' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD9DC' },
  btn: { backgroundColor: '#800020', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#800020', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#800020', fontWeight: '600' },
  err: { color: '#b00020' },
  note: { color: '#666' },
});
