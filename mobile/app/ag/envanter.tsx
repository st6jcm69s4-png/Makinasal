import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { PickerModal } from '../../components/PickerModal';
import { Btn, common, Field, Select } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { MACHINE_CATEGORIES } from '../../lib/data';
import { EQUIPMENT_STATUS, networkError } from '../../lib/network';
import { supabase, type Row } from '../../lib/supabase';

const empty = { category: '', brand: '', model: '', year: '', quantity: '1', capacity: '', description: '', availability: 'available' };

export default function Inventory() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'cat' | 'av'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    const r = await supabase.from('company_inventory').select('*').eq('owner_id', uid).order('created_at', { ascending: false }).limit(200);
    if (r.error) setError('Envanter yüklenemedi.'); else setItems((r.data ?? []) as Row[]);
    setLoading(false);
  }, [uid]);
  useEffect(() => { void load(); }, [load]);
  if (!uid) return <Text style={common.empty}>Önce giriş yap.</Text>;
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;

  async function save() {
    if (!form) return;
    if (!form.category || !form.model.trim()) { setError('Kategori ve model gerekli.'); return; }
    setBusy(true); setError('');
    const data = { category: form.category, brand: form.brand.trim(), model: form.model.trim(), year: form.year ? Number(form.year) : null, quantity: Number(form.quantity) || 1, capacity: form.capacity.trim(), description: form.description.trim(), availability: form.availability, published: true };
    const r = editId
      ? await supabase.from('company_inventory').update(data).eq('id', editId).eq('owner_id', uid!).select('id').single()
      : await supabase.from('company_inventory').insert({ ...data, owner_id: uid }).select('id').single();
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else { setForm(null); setEditId(null); void load(); }
  }
  function remove(i: Row) {
    Alert.alert('Sil', `${i.brand ?? ''} ${i.model} kaydı silinsin mi?`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: async () => {
      const r = await supabase.from('company_inventory').delete().eq('id', i.id).eq('owner_id', uid!).select('id').single();
      if (r.error) setError(networkError(r.error)); else void load();
    } }]);
  }
  const set = (k: keyof typeof empty) => (v: string) => setForm((c) => (c ? { ...c, [k]: v } : c));
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
      {error ? <Text style={common.err}>{error}</Text> : null}
      {form ? (
        <View style={[common.card, { gap: 10 }]}>
          <Select label="Kategori" value={form.category} onPress={() => setSheet('cat')} />
          <Field label="Marka" value={form.brand} onChangeText={set('brand')} />
          <Field label="Model" value={form.model} onChangeText={set('model')} />
          <Field label="Model yılı" value={form.year} onChangeText={set('year')} keyboardType="number-pad" />
          <Field label="Adet" value={form.quantity} onChangeText={set('quantity')} keyboardType="number-pad" />
          <Field label="Kapasite" value={form.capacity} onChangeText={set('capacity')} />
          <Field label="Açıklama" value={form.description} onChangeText={set('description')} multiline />
          <Select label="Durum" value={EQUIPMENT_STATUS[form.availability]} onPress={() => setSheet('av')} />
          <Btn title={busy ? 'Kaydediliyor…' : 'Kaydet'} onPress={() => void save()} disabled={busy} />
          <Btn ghost title="Vazgeç" onPress={() => { setForm(null); setEditId(null); }} />
        </View>
      ) : <Btn title="Makine / araç ekle" onPress={() => { setForm(empty); setEditId(null); }} />}
      {items.length === 0 ? <Text style={common.meta}>Envanterde kayıt yok. Önce Firma profilini kaydetmiş olmalısın.</Text> : null}
      {items.map((i) => (
        <View key={String(i.id)} style={common.card}>
          <Text style={common.title}>{String(i.brand ?? '')} {String(i.model)}</Text>
          <Text style={common.meta}>{[i.category, i.quantity + ' adet', i.year, EQUIPMENT_STATUS[String(i.availability)]].filter(Boolean).join(' · ')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1 }}><Btn ghost title="Düzenle" onPress={() => { setEditId(String(i.id)); setForm({ category: String(i.category), brand: String(i.brand ?? ''), model: String(i.model), year: i.year ? String(i.year) : '', quantity: String(i.quantity), capacity: String(i.capacity ?? ''), description: String(i.description ?? ''), availability: String(i.availability) }); }} /></View>
            <View style={{ flex: 1 }}><Btn danger title="Sil" onPress={() => remove(i)} /></View>
          </View>
        </View>
      ))}
      <PickerModal visible={sheet === 'cat'} title="Kategori" selected={form?.category ?? ''} options={MACHINE_CATEGORIES.map((c) => ({ value: c, label: c }))} onPick={set('category')} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'av'} title="Durum" selected={form?.availability ?? ''} options={Object.entries(EQUIPMENT_STATUS).map(([value, label]) => ({ value, label }))} onPick={set('availability')} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}
