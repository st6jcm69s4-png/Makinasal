import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { PickerModal } from '../components/PickerModal';
import { useApp } from '../lib/AppContext';
import { CITIES } from '../lib/data';
import { districtsFor, formatPersonName, validRegion } from '../lib/regions';
import { supabase } from '../lib/supabase';
import { color, font, radius, shadow } from '../lib/theme';

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
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

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
      if (!r?.full_name) setEditing(true);
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
    setName(formatPersonName(name)); setEditing(false); setSaved(true);
  }

  if (!session) return <Text style={s.msg}>Giriş yap.</Text>;
  if (!loaded) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.bg }}><ActivityIndicator color={color.teal} /></View>;
  if (!editing) {
    const info: [IconName, string, string][] = [
      ['phone', 'Telefon', phone], ['map-pin', 'Konum', [city, district].filter(Boolean).join(' / ')],
      ...(store ? [['briefcase', 'Firma', storeName] as [IconName, string, string]] : []),
    ];
    return (
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        {saved ? <View style={s.ok}><Icon name="check-circle" size={18} color={color.tealText} /><Text style={s.okT}>Bilgilerin kaydedildi.</Text></View> : null}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.avatar}><PlainText style={s.avatarT}>{name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}</PlainText></View>
            <View style={{ flex: 1, gap: 3 }}>
              <PlainText style={s.name}>{name}</PlainText>
              <Text style={s.small}>{store ? 'Kurumsal üyelik' : 'Bireysel üyelik'}</Text>
            </View>
          </View>
          {info.map(([ic, k, v]) => (
            <View key={k} style={s.row}><Icon name={ic} size={16} color={color.tealText} /><Text style={s.rowK}>{k}</Text>{v ? <PlainText style={s.rowV}>{v}</PlainText> : <Text style={[s.rowV, { color: color.muted }]}>Eklenmedi</Text>}</View>
          ))}
          {bio ? <><Text style={s.h}>Hakkımda</Text><PlainText style={s.text}>{bio}</PlainText></> : null}
          {store && companyBio ? <><Text style={s.h}>Firma hakkında</Text><PlainText style={s.text}>{companyBio}</PlainText></> : null}
        </View>
        <Pressable style={s.btn} onPress={() => { setSaved(false); setEditing(true); }} accessibilityRole="button"><Icon name="edit-2" size={17} color={color.tealInk} /><Text style={s.btnText}>Düzenle</Text></Pressable>
      </ScrollView>
    );
  }
  const input = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={set} {...extra} /></View>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {input('Ad soyad', name, setName)}
        {input('Telefon', phone, setPhone, { keyboardType: 'phone-pad' })}
        <Text style={s.small}>Telefonunu değiştirirsen doğrulaman sıfırlanır; doğrulama web sitesinden yapılır.</Text>
        <View style={{ gap: 6 }}><Text style={s.label}>İl</Text><Pressable style={[s.input, s.select]} onPress={() => setSheet('city')}><Text style={{ flex: 1, fontSize: 16 }}>{city || 'Seç'}</Text><Icon name="chevron-down" size={18} color={color.muted} /></Pressable></View>
        <View style={{ gap: 6 }}><Text style={s.label}>İlçe</Text><Pressable style={[s.input, s.select]} onPress={() => (city ? setSheet('district') : setErr('Önce il seç.'))}><Text style={{ flex: 1, fontSize: 16 }}>{district || 'Seç'}</Text><Icon name="chevron-down" size={18} color={color.muted} /></Pressable></View>
        {input('Hakkımda', bio, setBio, { multiline: true, maxLength: 500 })}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ flex: 1, fontSize: 15.5 }}>Kurumsal üyelik (firma)</Text><Switch value={store} onValueChange={setStore} trackColor={{ true: color.teal, false: color.plate }} /></View>
        {store ? (<>{input('Firma adı', storeName, setStoreName)}{input('Firma hakkında', companyBio, setCompanyBio, { multiline: true, maxLength: 800 })}</>) : null}
        {err ? <Text style={s.err}>{err}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {name ? <Pressable style={[s.ghost, { flex: 1 }]} onPress={() => { setErr(''); setEditing(false); }} accessibilityRole="button"><Text style={s.ghostT}>Vazgeç</Text></Pressable> : null}
          <Pressable style={[s.btn, { flex: 1 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void save()} accessibilityRole="button"><Icon name="check" size={18} color={color.tealInk} /><Text style={s.btnText}>Kaydet</Text></Pressable>
        </View>
      </ScrollView>
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(c) => { setCity(c); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={districtsFor(city).map((d) => ({ value: d, label: d }))} onPick={setDistrict} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  label: { fontFamily: font.semi, fontSize: 14, color: color.muted },
  input: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: color.surface, borderRadius: radius, borderWidth: 1, borderColor: color.line, color: color.ink },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  small: { color: color.muted, fontSize: 12.5 },
  err: { color: color.bad },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: color.teal, minHeight: 52, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  ghost: { minHeight: 52, borderRadius: radius, borderWidth: 1.5, borderColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  ghostT: { color: color.tealText, fontFamily: font.bold, fontSize: 16 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius, backgroundColor: color.tealSoft },
  okT: { color: color.ink, fontFamily: font.semi, flex: 1 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 12, ...shadow },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: color.tealInk, fontFamily: font.bold, fontSize: 24 },
  name: { color: color.ink, fontFamily: font.bold, fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowK: { color: color.muted, fontSize: 14, width: 80 },
  rowV: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 14.5 },
  h: { fontFamily: font.bold, fontSize: 15.5, color: color.ink },
  text: { color: color.ink, fontSize: 15, lineHeight: 22 },
});
