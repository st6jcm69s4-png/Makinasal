import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '../../components/LText';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../../components/PickerModal';
import { Btn, common, Field, Select } from '../../components/ui';
import { useApp } from '../../lib/AppContext';
import { CATEGORIES, CITIES } from '../../lib/data';
import { districtsFor } from '../../lib/regions';
import { networkError, PERSONNEL_ROLES, POST_KINDS, RENTAL_MODES, UNITS, validDate, type PostKind } from '../../lib/network';
import { supabase } from '../../lib/supabase';

type Sheet = null | 'cat' | 'city' | 'district' | 'unit' | 'mode' | 'role';

export default function NewPost() {
  const { kind: kindParam, edit } = useLocalSearchParams<{ kind?: string; edit?: string }>();
  const { session } = useApp();
  const [kind, setKind] = useState<PostKind>((kindParam && kindParam in POST_KINDS ? kindParam : 'rental_machine') as PostKind);
  const [f, setF] = useState({ title: '', description: '', category: '', brand: '', model: '', city: '', district: '', start: '', end: '', price: '', unit: 'toplam', qty: '1', specs: '', mode: '', role: '' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!edit);
  const set = (k: keyof typeof f) => (v: string) => setF((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    if (!edit || !session) return;
    void supabase.from('market_posts').select('*').eq('id', edit).eq('owner_id', session.user.id).maybeSingle().then((r) => {
      const p = r.data;
      if (!p) setError('Düzenlenecek ilan bulunamadı.');
      else {
        setKind(p.kind);
        setF({ title: p.title, description: p.description, category: p.category, brand: p.brand ?? '', model: p.model ?? '', city: p.city, district: p.district ?? '', start: p.start_date ?? '', end: p.end_date ?? '', price: p.price == null ? '' : String(p.price), unit: p.price_unit, qty: String(p.quantity), specs: p.specs ?? '', mode: p.rental_mode ?? '', role: p.personnel_role ?? '' });
      }
      setLoading(false);
    });
  }, [edit, session]);

  if (!session) return <Text style={common.empty}>İlan vermek için önce Hesabım sekmesinden giriş yap.</Text>;
  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;

  async function save() {
    if (f.title.trim().length < 5 || f.description.trim().length < 10) { setError('Başlık en az 5, açıklama en az 10 karakter olmalı.'); return; }
    if (!f.category || !f.city) { setError('Kategori ve il seçmelisin.'); return; }
    if (kind === 'rental_machine' && !f.mode) { setError('Operatörlü / sadece makine seçeneğini belirt.'); return; }
    if (kind === 'rental_operator' && !f.role) { setError('Hizmet türünü seç.'); return; }
    if ((f.start && !validDate(f.start)) || (f.end && !validDate(f.end))) { setError('Tarihleri YYYY-AA-GG biçiminde yaz (ör. 2026-11-20).'); return; }
    if (f.end && (!f.start || f.end < f.start)) { setError('Bitiş tarihi başlangıçtan önce olamaz.'); return; }
    const qty = Number(f.qty);
    if (!Number.isInteger(qty) || qty < 1) { setError('Adet geçerli bir sayı olmalı.'); return; }
    setBusy(true); setError('');
    const data = {
      kind, rental_mode: kind === 'rental_machine' ? f.mode : null, personnel_role: kind === 'rental_operator' ? f.role : null,
      title: f.title.trim(), description: f.description.trim(), category: f.category, brand: f.brand.trim(), model: f.model.trim(),
      city: f.city, district: f.district, start_date: f.start || null, end_date: f.end || null,
      price: f.price ? Number(f.price.replace(',', '.')) : null, price_unit: f.unit, quantity: qty, specs: f.specs.trim(),
    };
    const uid = session!.user.id;
    const r = edit
      ? await supabase.from('market_posts').update(data).eq('id', edit).eq('owner_id', uid).select('id').single()
      : await supabase.from('market_posts').insert({ ...data, owner_id: uid, preferred_provider: null }).select('id').single();
    setBusy(false);
    if (r.error) { setError(networkError(r.error)); return; }
    router.replace(`/ag/ilan/${r.data.id}` as never);
  }
  const opts = (a: readonly string[]) => a.map((x) => ({ value: x, label: x }));
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} style={common.screen} keyboardShouldPersistTaps="handled">
      <Text style={common.h2}>{POST_KINDS[kind]}</Text>
      <Field label="Başlık" value={f.title} onChangeText={set('title')} />
      <Field label="Açıklama" value={f.description} onChangeText={set('description')} multiline />
      <Select label="Kategori" value={f.category} onPress={() => setSheet('cat')} />
      {kind === 'rental_machine' ? <Select label="Çalışma türü" value={f.mode ? RENTAL_MODES[f.mode as keyof typeof RENTAL_MODES] : ''} onPress={() => setSheet('mode')} /> : null}
      {kind === 'rental_operator' ? <Select label="Hizmet türü" value={f.role ? PERSONNEL_ROLES[f.role as keyof typeof PERSONNEL_ROLES] : ''} onPress={() => setSheet('role')} /> : null}
      <Field label="Marka" value={f.brand} onChangeText={set('brand')} />
      <Field label="Model" value={f.model} onChangeText={set('model')} />
      <Select label="İl" value={f.city} onPress={() => setSheet('city')} />
      {f.city && districtsFor(f.city).length ? <Select label="İlçe" value={f.district} onPress={() => setSheet('district')} placeholder="İlçe seç (isteğe bağlı)" /> : null}
      <Field label="Başlangıç (YYYY-AA-GG)" value={f.start} onChangeText={set('start')} placeholder="2026-11-20" autoCapitalize="none" />
      <Field label="Bitiş (YYYY-AA-GG)" value={f.end} onChangeText={set('end')} placeholder="2026-11-25" autoCapitalize="none" />
      <Field label="Bütçe / fiyat (₺, boş bırakılabilir)" value={f.price} onChangeText={set('price')} keyboardType="decimal-pad" />
      <Select label="Birim" value={f.unit} onPress={() => setSheet('unit')} />
      <Field label="Adet" value={f.qty} onChangeText={set('qty')} keyboardType="number-pad" />
      <Field label="Teknik özellikler" value={f.specs} onChangeText={set('specs')} multiline />
      {error ? <Text style={common.err}>{error}</Text> : null}
      <Btn title={busy ? 'Kaydediliyor…' : edit ? 'Değişiklikleri kaydet' : 'Yayınla'} onPress={() => void save()} disabled={busy} />
      <PickerModal visible={sheet === 'cat'} title="Kategori" selected={f.category} options={opts(CATEGORIES)} onPick={set('category')} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={f.city} options={opts(CITIES)} onPick={(v) => setF((c) => ({ ...c, city: v, district: '' }))} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={f.district} options={[{ value: '', label: 'Belirtme' }, ...opts(districtsFor(f.city))]} onPick={set('district')} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'unit'} title="Birim" selected={f.unit} options={opts(UNITS)} onPick={set('unit')} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'mode'} title="Çalışma türü" selected={f.mode} options={Object.entries(RENTAL_MODES).map(([value, label]) => ({ value, label }))} onPick={set('mode')} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'role'} title="Hizmet türü" selected={f.role} options={Object.entries(PERSONNEL_ROLES).map(([value, label]) => ({ value, label }))} onPick={set('role')} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}
