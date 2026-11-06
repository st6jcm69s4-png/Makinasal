import { useEffect, useState } from 'react';
import { GuestGate } from '../../components/LoginPrompt';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { PlainText, Text } from '../../components/LText';
import { Icon, type IconName } from '../../components/Icon';
import { router } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { Chip, Field, Select } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { CITIES } from '../../lib/data';
import { districtsFor } from '../../lib/regions';
import { ACTIVITIES, COMPANY_CATEGORIES, networkError, PROVIDER_KINDS } from '../../lib/network';
import { supabase } from '../../lib/supabase';
import { color, font, radius, shadow } from '../../lib/theme';

/** Firma profilim: kayıtlı profil önce görüntülenir; düzenleme yalnızca "Düzenle" ile açılır. */
export default function ProviderForm() {
  const { session } = useApp();
  const [exists, setExists] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('excavation');
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [acts, setActs] = useState<string[]>([]);
  const [published, setPublished] = useState(true);
  const [sheet, setSheet] = useState<null | 'kind' | 'cat' | 'city' | 'district' | 'area'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    void supabase.from('service_providers').select('*').eq('user_id', session.user.id).maybeSingle().then((r) => {
      const p = r.data;
      if (p) { setExists(true); setName(p.name); setKind(p.kind); setCat(p.company_category ?? ''); setDesc(p.description); setCity(p.city); setDistrict(p.district ?? ''); setAreas(p.service_cities); setActs(p.specialties); setPublished(p.published); }
      else setEditing(true);
      setLoading(false);
    });
  }, [session]);
  if (!session) return <GuestGate icon="briefcase" text="Firma profili oluşturmak için giriş yap." />;
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={color.teal} /></View>;
  const uid = session.user.id;

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  async function save() {
    if (name.trim().length < 2 || desc.trim().length < 10 || !city) { setError('Firma adı, il ve en az 10 karakterlik açıklama gerekli.'); return; }
    if (!areas.length || !acts.length) { setError('En az bir hizmet ili ve iş alanı seç.'); return; }
    setBusy(true); setError('');
    const data = { name: name.trim(), kind, company_category: cat || null, description: desc.trim(), city, district, service_cities: areas, specialties: acts, published };
    const r = exists
      ? await supabase.from('service_providers').update(data).eq('user_id', uid).select('user_id').single()
      : await supabase.from('service_providers').insert({ ...data, user_id: uid }).select('user_id').single();
    setBusy(false);
    if (r.error) { setError(networkError(r.error)); return; }
    setExists(true); setEditing(false); setSaved(true);
  }

  const parkBtn = (
    <Pressable style={({ pressed }) => [s.park, pressed && { opacity: 0.88 }]} onPress={() => router.push('/ag/envanter' as never)} accessibilityRole="button">
      <View style={s.parkIcon}><Icon name="package" size={20} color={color.tealInk} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.parkT}>Makinelerim ve araçlarım</Text>
        <Text style={s.parkS}>Firmana ait makine ve araçları ekle, müsaitliklerini göster.</Text>
      </View>
      <Icon name="chevron-right" size={20} color={color.tealText} />
    </Pressable>
  );

  if (!editing) {
    const info: [IconName, string, string][] = [
      ['briefcase', 'Hizmet türü', PROVIDER_KINDS[kind as keyof typeof PROVIDER_KINDS] ?? ''],
      ['layers', 'Firma kategorisi', cat],
      ['map-pin', 'Konum', [city, district].filter(Boolean).join(' / ')],
    ];
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.body}>
        {saved ? <View style={s.ok}><Icon name="check-circle" size={18} color={color.tealText} /><Text style={s.okT}>Firma profilin kaydedildi.</Text></View> : null}
        <View style={s.card}>
          <View style={s.top}>
            <View style={s.logo}><PlainText style={s.logoT}>{name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}</PlainText></View>
            <View style={{ flex: 1, gap: 4 }}>
              <PlainText style={s.name}>{name}</PlainText>
              <View style={[s.pill, { backgroundColor: published ? color.tealSoft : color.plate }]}>
                <Icon name={published ? 'eye' : 'eye-off'} size={13} color={published ? color.tealText : color.muted} />
                <Text style={[s.pillT, { color: published ? color.tealText : color.muted }]}>{published ? 'Herkese açık' : 'Gizli'}</Text>
              </View>
            </View>
          </View>
          {info.filter(([, , v]) => v).map(([ic, k, v]) => (
            <View key={k} style={s.row}>
              <Icon name={ic} size={16} color={color.tealText} />
              <Text style={s.rowK}>{k}</Text>
              <Text style={s.rowV} numberOfLines={2}>{v}</Text>
            </View>
          ))}
          <PlainText style={s.desc}>{desc}</PlainText>
          <Text style={s.h}>Hizmet verdiğin iller</Text>
          <View style={s.tags}>{areas.map((a) => <View key={a} style={s.tag}><PlainText style={s.tagT}>{a}</PlainText></View>)}</View>
          <Text style={s.h}>İş alanları</Text>
          <View style={s.tags}>{acts.map((a) => <View key={a} style={s.tag}><Text style={s.tagT}>{a}</Text></View>)}</View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable style={[s.btn, { flex: 1 }]} onPress={() => { setSaved(false); setEditing(true); }} accessibilityRole="button">
            <Icon name="edit-2" size={17} color={color.tealInk} /><Text style={s.btnT}>Düzenle</Text>
          </Pressable>
          <Pressable style={[s.ghost, { flex: 1 }]} onPress={() => router.push(`/firma/${uid}` as never)} accessibilityRole="button">
            <Icon name="external-link" size={17} color={color.tealText} /><Text style={s.ghostT}>Profilimi gör</Text>
          </Pressable>
        </View>
        {parkBtn}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.body} style={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Field label="Firma / hizmet adı" value={name} onChangeText={setName} />
        <Select label="Hizmet türü" value={PROVIDER_KINDS[kind as keyof typeof PROVIDER_KINDS]} onPress={() => setSheet('kind')} />
        <Select label="Firma kategorisi" value={cat} onPress={() => setSheet('cat')} placeholder="İsteğe bağlı" />
        <Field label="Açıklama" value={desc} onChangeText={setDesc} multiline />
        <Select label="İl" value={city} onPress={() => setSheet('city')} />
        {city && districtsFor(city).length ? <Select label="İlçe" value={district} onPress={() => setSheet('district')} placeholder="İsteğe bağlı" /> : null}
      </View>
      <View style={s.card}>
        <Text style={s.h}>Hizmet verdiğin iller</Text>
        <View style={s.tags}>
          {areas.map((a) => <Chip key={a} on title={`${a} ✕`} onPress={() => setAreas(areas.filter((x) => x !== a))} />)}
          <Chip title="+ İl ekle" onPress={() => setSheet('area')} />
        </View>
        <Text style={s.h}>İş alanları</Text>
        <View style={s.tags}>
          {ACTIVITIES.map((a) => <Chip key={a} title={a} on={acts.includes(a)} onPress={() => toggle(acts, a, setActs)} />)}
        </View>
        <View style={s.switchRow}>
          <Text style={{ flex: 1, color: color.ink, fontSize: 15.5 }}>Profil herkese açık yayınlansın</Text>
          <Switch value={published} onValueChange={setPublished} trackColor={{ true: color.teal, false: color.plate }} />
        </View>
      </View>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {exists ? <Pressable style={[s.ghost, { flex: 1 }]} onPress={() => { setError(''); setEditing(false); }} accessibilityRole="button"><Text style={s.ghostT}>Vazgeç</Text></Pressable> : null}
        <Pressable style={[s.btn, { flex: 1 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void save()} accessibilityRole="button">
          {busy ? <ActivityIndicator color={color.tealInk} /> : <><Icon name="check" size={18} color={color.tealInk} /><Text style={s.btnT}>Kaydet</Text></>}
        </Pressable>
      </View>
      {exists ? parkBtn : null}
      <PickerModal visible={sheet === 'kind'} title="Hizmet türü" selected={kind} options={Object.entries(PROVIDER_KINDS).map(([value, label]) => ({ value, label }))} onPick={setKind} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'cat'} title="Firma kategorisi" selected={cat} options={[{ value: '', label: 'Belirtme' }, ...COMPANY_CATEGORIES.map((c) => ({ value: c, label: c }))]} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(v) => { setCity(v); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={[{ value: '', label: 'Belirtme' }, ...districtsFor(city).map((c) => ({ value: c, label: c }))]} onPick={setDistrict} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'area'} title="Hizmet ili ekle" selected="" options={CITIES.filter((c) => !areas.includes(c)).map((c) => ({ value: c, label: c }))} onPick={(v) => setAreas([...areas, v])} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius, backgroundColor: color.tealSoft },
  okT: { color: color.ink, fontFamily: font.semi, flex: 1 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 12, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  logoT: { color: color.tealInk, fontFamily: font.bold, fontSize: 24 },
  name: { color: color.ink, fontFamily: font.bold, fontSize: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pillT: { fontSize: 12.5, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowK: { color: color.muted, fontSize: 14, width: 120 },
  rowV: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 14.5 },
  desc: { color: color.ink, fontSize: 15, lineHeight: 22 },
  h: { fontFamily: font.bold, fontSize: 15.5, color: color.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 12, backgroundColor: color.tealSoft, paddingHorizontal: 10, paddingVertical: 5 },
  tagT: { color: color.tealText, fontSize: 13.5, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  err: { color: color.bad, textAlign: 'center' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: color.teal, minHeight: 52, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  ghost: { flexDirection: 'row', gap: 8, minHeight: 52, borderRadius: radius, borderWidth: 1.5, borderColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  ghostT: { color: color.tealText, fontFamily: font.bold, fontSize: 16 },
  park: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius + 4, backgroundColor: color.tealSoft, borderWidth: 1, borderColor: color.teal },
  parkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  parkT: { color: color.ink, fontFamily: font.bold, fontSize: 16 },
  parkS: { color: color.muted, fontSize: 13.5, marginTop: 2 },
});
