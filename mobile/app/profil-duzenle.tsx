import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text, TextInput } from '../components/LText';
import { router } from 'expo-router';
import { PickerModal } from '../components/PickerModal';
import { useApp } from '../lib/AppContext';
import { CITIES } from '../lib/data';
import { districtsFor, formatPersonName, validRegion } from '../lib/regions';
import { supabase } from '../lib/supabase';
import { color } from '../lib/theme';

type Sheet = null | 'city' | 'district';
export default function EditProfile() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [bio, setBio] = useState('');
  const [store, setStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [companyBio, setCompanyBio] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const [p, ph] = await Promise.all([
        supabase.from('profiles').select('full_name,city,district,bio,company_bio,is_store,store_name').eq('id', uid).maybeSingle(),
        supabase.rpc('my_phone'),
      ]);
      const r = p.data as { full_name: string; city: string | null; district: string | null; bio: string | null; company_bio: string | null; is_store: boolean; store_name: string | null } | null;
      if (r) { setName(formatPersonName(r.full_name ?? '')); setCity(r.city ?? ''); setDistrict(r.district ?? ''); setBio(r.bio ?? ''); setCompanyBio(r.company_bio ?? ''); setStore(!!r.is_store); setStoreName(r.store_name ?? ''); }
      setPhone((ph.data as string | null) ?? '');
      setLoaded(true);
    })();
  }, [uid]);

  async function save() {
    if (!uid) return;
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    if (cleanPhone && !/^(\+90|0)?5\d{9}$/.test(cleanPhone)) return setErr('Telefon numarasını 05XX XXX XX XX biçiminde yaz.');
    if (store && !storeName.trim()) return setErr('Kurumsal üyelikte firma adı gerekli.');
    if (formatPersonName(name).length < 2) return setErr('Ad soyadını en az 2 karakter olarak gir.');
    if (!validRegion(city, district)) return setErr('İl ve ilçe seçimini kontrol et.');
    setBusy(true); setErr('');
    const { error } = await supabase.from('profiles').update({
      full_name: formatPersonName(name), city: city || null, district, bio: bio.trim(), company_bio: companyBio.trim(), is_store: store, store_name: store ? storeName.trim() : null, phone: cleanPhone || null,
    }).eq('id', uid);
    setBusy(false);
    if (error) return setErr('Bilgiler kaydedilemedi. Tekrar dene.');
    Alert.alert('Profil', 'Bilgilerin kaydedildi.');
    router.back();
  }

  if (!session) return <Text style={s.msg}>Giriş yap.</Text>;
  if (!loaded) return <Text style={s.msg}>Yükleniyor…</Text>;
  const input = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <View style={{ gap: 4 }}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={set} {...extra} /></View>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {input('Ad soyad', name, setName)}
        {input('Telefon', phone, setPhone, { keyboardType: 'phone-pad' })}
        <Text style={s.small}>Telefonunu değiştirirsen doğrulaman sıfırlanır; doğrulama web sitesinden yapılır.</Text>
        <View style={{ gap: 4 }}><Text style={s.label}>İl</Text><Pressable style={s.input} onPress={() => setSheet('city')}><Text>{city || 'Seç'}</Text></Pressable></View>
        <View style={{ gap: 4 }}><Text style={s.label}>İlçe</Text><Pressable style={s.input} onPress={() => (city ? setSheet('district') : setErr('Önce il seç.'))}><Text>{district || 'Seç'}</Text></Pressable></View>
        {input('Hakkımda', bio, setBio, { multiline: true, maxLength: 500 })}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ flex: 1 }}>Kurumsal üyelik (firma)</Text><Switch value={store} onValueChange={setStore} /></View>
        {store ? (<>{input('Firma adı', storeName, setStoreName)}{input('Firma hakkında', companyBio, setCompanyBio, { multiline: true, maxLength: 800 })}</>) : null}
        {err ? <Text style={s.err}>{err}</Text> : null}
        <Pressable style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void save()} accessibilityRole="button"><Text style={s.btnText}>Kaydet</Text></Pressable>
      </ScrollView>
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(c) => { setCity(c); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={districtsFor(city).map((d) => ({ value: d, label: d }))} onPick={setDistrict} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  label: { fontWeight: '600' },
  input: { padding: 12, backgroundColor: color.surface, borderRadius: 4, borderWidth: 1, borderColor: color.line },
  small: { color: color.muted, fontSize: 12 },
  err: { color: color.bad },
  btn: { backgroundColor: color.accent, padding: 14, borderRadius: 4, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
