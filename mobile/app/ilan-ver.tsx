import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { PickerModal } from '../components/PickerModal';
import { useApp } from '../lib/AppContext';
import { CATEGORIES, CITIES, KM_CATEGORIES, LIMITS, MACHINE_CATEGORIES, PART_GROUPS } from '../lib/data';
import { supabase } from '../lib/supabase';

const CONDITIONS = ['Sıfır', 'Çıkma', 'Revizyonlu'];
const YEAR_MAX = new Date().getFullYear() + 1;
type Sheet = null | 'cat' | 'city' | 'equip' | 'group' | 'cond';

export default function NewListing() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [premium, setPremium] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [usage, setUsage] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [desc, setDesc] = useState('');
  const [takas, setTakas] = useState(false);
  const [spec, setSpec] = useState('');
  const [cond, setCond] = useState('Sıfır');
  const [compat, setCompat] = useState('');
  const [qty, setQty] = useState('1');
  const [equip, setEquip] = useState('');
  const [group, setGroup] = useState('');
  const [pledge, setPledge] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) return;
    void supabase.from('profiles').select('is_premium').eq('id', uid).maybeSingle().then(({ data }) => setPremium(!!(data as { is_premium?: boolean } | null)?.is_premium));
  }, [uid]);

  const part = cat === 'Yedek parça' || cat === 'Lastik ve jant';
  const kind = !cat ? '' : cat === 'Yedek parça' ? 'part' : cat === 'Lastik ve jant' ? 'tire' : 'machine';
  const unit = KM_CATEGORIES.has(cat) ? 'km' : 'saat';
  const maxPhotos = premium ? LIMITS.prem.photos : LIMITS.free.photos;

  async function pick(camera: boolean) {
    const room = maxPhotos - photos.length;
    if (room <= 0) { Alert.alert('Fotoğraf', `En fazla ${maxPhotos} fotoğraf ekleyebilirsin.`); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('İzin gerekli', 'Fotoğraf eklemek için izin vermelisin. Telefon ayarlarından değiştirebilirsin.'); return; }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.6 });
    if (res.canceled) return;
    setPhotos((cur) => [...cur, ...res.assets.map((a) => a.uri)].slice(0, maxPhotos));
  }

  async function submit() {
    if (!uid || busy) return;
    setError('');
    const priceNum = Number(price.replace(/\./g, '').replace(',', '.'));
    const yearNum = year ? Number(year) : null;
    if (!cat) return setError('Kategori seç.');
    if (!brand.trim() || !model.trim()) return setError(`Marka ve ${part ? 'ürün adı' : 'model'} alanlarını doldur.`);
    if (part) {
      if (!(MACHINE_CATEGORIES as readonly string[]).includes(equip) || !PART_GROUPS.some((g) => g.id === group)) return setError('Parçanın makine / araç türünü ve parça grubunu seç.');
      if (!spec.trim()) return setError(`${cat === 'Lastik ve jant' ? 'Lastik ebadını' : 'Parça numarasını'} gir.`);
      if (!Number.isSafeInteger(Number(qty)) || Number(qty) < 1) return setError('Adet gir.');
    } else {
      if (!yearNum || !Number.isInteger(yearNum) || yearNum < 1980 || yearNum > YEAR_MAX) return setError(`Model yılı 1980 ile ${YEAR_MAX} arasında olmalı.`);
      if (usage === '' || !Number.isSafeInteger(Number(usage)) || Number(usage) < 0) return setError(`${unit === 'km' ? 'Kilometre' : 'Çalışma saati'} değerini gir.`);
    }
    if (!city) return setError('İl seç.');
    if (desc.trim().length < 10) return setError('Açıklamayı en az 10 karakterle yaz.');
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 999999999999.99) return setError('Fiyatı gir.');
    if (photos.length === 0) return setError('En az 1 fotoğraf ekle. Alıcılar fotoğrafsız ilanlara güvenmez.');
    if (!pledge) return setError('Kapora taahhüdünü onaylaman gerekiyor.');

    setBusy(true);
    let id: string | null = null;
    try {
      const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', uid).in('status', ['active', 'paused']);
      const maxListings = premium ? LIMITS.prem.listings : LIMITS.free.listings;
      if ((count ?? 0) >= maxListings) throw new Error(`${premium ? 'Premium' : 'Ücretsiz'} üyelikte aynı anda ${maxListings} ilan olabilir. İlanlarından birini satıldı yap ya da kaldır.`);
      const base = {
        seller_id: uid, status: 'paused', kind, category: cat, title: `${brand.trim()} ${model.trim()}`, description: desc.trim(), price: priceNum, city,
        year: part ? null : yearNum, usage_value: !part ? Number(usage) : null, usage_unit: !part ? unit : null,
        spec: part ? spec.trim() : null, cond: part ? cond : null, compat: part && compat.trim() ? compat.trim() : null, qty: part ? Number(qty) : null,
        equipment_category: part ? equip : null, part_group: part ? group : null,
        brand: brand.trim(), model: model.trim(), takas, serial_declared: false,
      };
      const created = await supabase.from('listings').insert(base).select('id').single();
      if (created.error || !created.data) throw new Error(created.error?.message.includes('RATE_LIMIT') ? 'Çok fazla işlem. Bir dakika sonra tekrar dene.' : 'İlan kaydedilemedi. Bilgileri kontrol edip tekrar dene.');
      id = (created.data as { id: string }).id;
      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Fotoğraflar yükleniyor (${i + 1}/${photos.length})…`);
        try {
          const buf = await (await fetch(photos[i])).arrayBuffer();
          const path = `${uid}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
          const up = await supabase.storage.from('listing-photos').upload(path, buf, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          const link = await supabase.from('listing_photos').insert({ listing_id: id, path, position: i });
          if (link.error) { await supabase.storage.from('listing-photos').remove([path]); throw link.error; }
        } catch { failed++; }
      }
      if (failed > 0) {
        Alert.alert('İlan', `${failed} fotoğraf yüklenemedi. İlanın duraklatılmış olarak saklandı; İlanlarım'dan kontrol edebilirsin.`);
        router.replace('/ilanlarim');
        return;
      }
      const published = await supabase.from('listings').update({ status: 'active' }).eq('id', id).eq('seller_id', uid);
      if (published.error) throw new Error('İlan kaydedildi ancak yayına alınamadı. İlanlarım ekranından "Yayına al" ile tekrar dene.');
      Alert.alert('İlan', 'İlan incelemeye gönderildi. Onaylandığında yayımlanacak.');
      router.replace('/ilanlarim');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu.');
      if (id) router.replace('/ilanlarim');
    } finally { setBusy(false); setProgress(''); }
  }

  if (!session) return <Text style={s.msg}>İlan vermek için giriş yap.</Text>;
  const field = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={set} {...extra} /></View>
  );
  const select = (label: string, value: string, open: Sheet) => (
    <View style={s.field}><Text style={s.label}>{label}</Text>
      <Pressable style={s.input} onPress={() => setSheet(open)} accessibilityRole="button"><Text style={{ color: value ? '#25272D' : '#999' }}>{value || 'Seç'}</Text></Pressable></View>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: '#F5F5F6' }} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {select('Kategori', cat, 'cat')}
        {part ? (
          <>
            {select('Hangi makine / araç için', equip, 'equip')}
            {select('Parça grubu', PART_GROUPS.find((g) => g.id === group)?.label ?? '', 'group')}
          </>
        ) : null}
        {field('Marka', brand, setBrand)}
        {field(part ? 'Ürün adı' : 'Model', model, setModel)}
        {part ? (
          <>
            {field(cat === 'Lastik ve jant' ? 'Lastik ebadı' : 'Parça numarası', spec, setSpec)}
            {select('Durum', cond, 'cond')}
            {field('Uyumlu makine veya araç (isteğe bağlı)', compat, setCompat)}
            {field('Adet', qty, setQty, { keyboardType: 'number-pad' })}
          </>
        ) : (
          <>
            {field('Model yılı', year, setYear, { keyboardType: 'number-pad', maxLength: 4 })}
            {field(unit === 'km' ? 'Kilometre' : 'Çalışma saati', usage, setUsage, { keyboardType: 'number-pad' })}
          </>
        )}
        {select('İl', city, 'city')}
        {field(part ? 'Birim fiyat (₺)' : 'Fiyat (₺)', price, setPrice, { keyboardType: 'decimal-pad' })}
        <View style={s.field}><Text style={s.label}>Açıklama</Text>
          <TextInput style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} multiline maxLength={4000} /></View>
        <View style={s.rowSwitch}><Text style={{ flex: 1 }}>Takas olur</Text><Switch value={takas} onValueChange={setTakas} /></View>

        <Text style={s.label}>Fotoğraflar ({photos.length}/{maxPhotos})</Text>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {photos.map((u, i) => (
            <Pressable key={u + i} onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır">
              <Image source={{ uri: u }} style={s.thumb} /><Text style={s.rm}>Kaldır</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={[s.btnGhost, { flex: 1 }]} onPress={() => void pick(true)} accessibilityRole="button"><Text style={s.btnGhostText}>Kamera</Text></Pressable>
          <Pressable style={[s.btnGhost, { flex: 1 }]} onPress={() => void pick(false)} accessibilityRole="button"><Text style={s.btnGhostText}>Galeri</Text></Pressable>
        </View>

        <View style={s.rowSwitch}><Text style={{ flex: 1 }}>Ürünü görmeden kapora, ön ödeme, havale veya EFT istemeyeceğimi taahhüt ederim.</Text><Switch value={pledge} onValueChange={setPledge} /></View>
        {error ? <Text style={s.err} accessibilityRole="alert">{error}</Text> : null}
        {progress ? <Text style={s.small}>{progress}</Text> : null}
        <Pressable style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void submit()} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>İlanı gönder</Text>}
        </Pressable>
        <Text style={s.small}>Yeni ilanlar yayına girmeden önce incelenir.</Text>
      </ScrollView>

      <PickerModal visible={sheet === 'cat'} title="Kategori" selected={cat} options={CATEGORIES.map((c) => ({ value: c, label: c }))} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={setCity} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'equip'} title="Makine / araç türü" selected={equip} options={MACHINE_CATEGORIES.map((c) => ({ value: c, label: c }))} onPick={setEquip} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'group'} title="Parça grubu" selected={group} options={PART_GROUPS.map((g) => ({ value: g.id, label: g.label }))} onPick={setGroup} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'cond'} title="Durum" selected={cond} options={CONDITIONS.map((c) => ({ value: c, label: c }))} onPick={setCond} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  form: { padding: 16, gap: 12 },
  field: { gap: 4 },
  label: { fontWeight: '600', color: '#25272D' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  rowSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 90, height: 70, borderRadius: 6 },
  rm: { textAlign: 'center', color: '#b00020', fontSize: 12 },
  btn: { backgroundColor: '#6B1E2E', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#6B1E2E', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#6B1E2E', fontWeight: '600' },
  err: { color: '#b00020' },
  small: { color: '#666', fontSize: 12 },
  msg: { textAlign: 'center', color: '#666', margin: 24 },
});
