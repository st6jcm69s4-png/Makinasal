import { useEffect, useState } from 'react';
import { GuestGate } from '../../components/LoginPrompt';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { Text } from '../../components/LText';
import { router } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { Btn, Chip, common, Field, Select } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { CITIES } from '../../lib/data';
import { districtsFor } from '../../lib/regions';
import { ACTIVITIES, COMPANY_CATEGORIES, networkError, PROVIDER_KINDS } from '../../lib/network';
import { supabase } from '../../lib/supabase';

export default function ProviderForm() {
  const { session } = useApp();
  const [exists, setExists] = useState(false);
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
      setLoading(false);
    });
  }, [session]);
  if (!session) return <GuestGate icon="briefcase" text="Firma profili oluşturmak için giriş yap." />;
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  async function save() {
    if (name.trim().length < 2 || desc.trim().length < 10 || !city) { setError('Firma adı, il ve en az 10 karakterlik açıklama gerekli.'); return; }
    if (!areas.length || !acts.length) { setError('En az bir hizmet ili ve iş alanı seç.'); return; }
    setBusy(true); setError('');
    const uid = session!.user.id;
    const data = { name: name.trim(), kind, company_category: cat || null, description: desc.trim(), city, district, service_cities: areas, specialties: acts, published };
    const r = exists
      ? await supabase.from('service_providers').update(data).eq('user_id', uid).select('user_id').single()
      : await supabase.from('service_providers').insert({ ...data, user_id: uid }).select('user_id').single();
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else router.replace(`/firma/${uid}` as never);
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} style={common.screen} keyboardShouldPersistTaps="handled">
      <Field label="Firma / hizmet adı" value={name} onChangeText={setName} />
      <Select label="Hizmet türü" value={PROVIDER_KINDS[kind as keyof typeof PROVIDER_KINDS]} onPress={() => setSheet('kind')} />
      <Select label="Firma kategorisi" value={cat} onPress={() => setSheet('cat')} placeholder="İsteğe bağlı" />
      <Field label="Açıklama" value={desc} onChangeText={setDesc} multiline />
      <Select label="İl" value={city} onPress={() => setSheet('city')} />
      {city && districtsFor(city).length ? <Select label="İlçe" value={district} onPress={() => setSheet('district')} placeholder="İsteğe bağlı" /> : null}
      <Text style={{ fontWeight: '600' }}>Hizmet verdiğin iller</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {areas.map((a) => <Chip key={a} on title={`${a} ✕`} onPress={() => setAreas(areas.filter((x) => x !== a))} />)}
        <Chip title="+ İl ekle" onPress={() => setSheet('area')} />
      </View>
      <Text style={{ fontWeight: '600' }}>İş alanları</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ACTIVITIES.map((a) => <Chip key={a} title={a} on={acts.includes(a)} onPress={() => toggle(acts, a, setActs)} />)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '600' }}>Profil herkese açık yayınlansın</Text>
        <Switch value={published} onValueChange={setPublished} />
      </View>
      {error ? <Text style={common.err}>{error}</Text> : null}
      <Btn title={busy ? 'Kaydediliyor…' : 'Kaydet'} onPress={() => void save()} disabled={busy} />
      {exists ? <Btn ghost title="Envanterim" onPress={() => router.push('/ag/envanter' as never)} /> : null}
      <PickerModal visible={sheet === 'kind'} title="Hizmet türü" selected={kind} options={Object.entries(PROVIDER_KINDS).map(([value, label]) => ({ value, label }))} onPick={setKind} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'cat'} title="Firma kategorisi" selected={cat} options={[{ value: '', label: 'Belirtme' }, ...COMPANY_CATEGORIES.map((c) => ({ value: c, label: c }))]} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(v) => { setCity(v); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={[{ value: '', label: 'Belirtme' }, ...districtsFor(city).map((c) => ({ value: c, label: c }))]} onPick={setDistrict} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'area'} title="Hizmet ili ekle" selected="" options={CITIES.filter((c) => !areas.includes(c)).map((c) => ({ value: c, label: c }))} onPick={(v) => setAreas([...areas, v])} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}
