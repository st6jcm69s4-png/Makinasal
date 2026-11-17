import { friendlyError } from '../lib/friendlyError';
import { normalizeVideoUrl } from '../lib/video';
import { toast } from '../components/Toast';
import { FormSkeleton } from '../components/kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONDITION_FIELDS, cleanTech, techFieldsFor, type TechField } from '../lib/techSpecs';
import { useEffect, useState, type ReactNode } from 'react';
import { GuestGate } from '../components/LoginPrompt';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { tr } from '../lib/i18n';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { PickerModal } from '../components/PickerModal';
import { useApp } from '../lib/AppContext';
import { CATEGORIES, CITIES, KM_CATEGORIES, LIMITS, MACHINE_CATEGORIES, PART_GROUPS } from '../lib/data';
import { brandsForCategory, canonicalBrand } from '../lib/machineryCatalog';
import { photoUrl, supabase } from '../lib/supabase';
import { maybeAskReview } from '../lib/review';
import * as haptic from '../lib/haptics';
import { shrinkPhoto } from '../lib/photo';
import { ensureListingQuota, fetchQuota, isQuotaError, quotaLine, type Quota } from '../lib/quota';
import { useLang } from '../lib/lang';
import { filledCount, importFromScreenshots, pickScreenshots, type ImportedFields } from '../lib/listingImport';
import { color, font, radius, shadow, fixed } from '../lib/theme';

const CONDITIONS = ['Sıfır', 'Çıkma', 'Revizyonlu'];
const YEAR_MAX = new Date().getFullYear() + 1;
type Sheet = null | 'cat' | 'city' | 'equip' | 'group' | 'cond' | 'brand';

export default function NewListing() {
  const { session } = useApp();
  const uid = session?.user.id;
  const { duzenle } = useLocalSearchParams<{ duzenle?: string }>();
  const editId = duzenle || '';
  const [existing, setExisting] = useState<{ id: string; path: string }[]>([]);
  const [removed, setRemoved] = useState<{ id: string; path: string }[]>([]);
  const [loadedEdit, setLoadedEdit] = useState(!editId);
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
  const [video, setVideo] = useState('');
  const [tech, setTech] = useState<Record<string, string>>({});
  type PickedVideo = { uri: string; ext: 'mp4' | 'mov'; mime: string; size: number | null; duration: number | null };
  const [videoFile, setVideoFile] = useState<PickedVideo | null>(null);
  const [oldVideo, setOldVideo] = useState<string | null>(null);
  const [dropOldVideo, setDropOldVideo] = useState(false);
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
  const [quota, setQuota] = useState<Quota | null>(null);
  const { lang } = useLang();
  useEffect(() => { if (uid && !editId) void fetchQuota().then(setQuota); }, [uid, editId]);

  // Başka sitedeki ilanı ekran görüntülerinden aktarma: bilgiler forma yazılır, kullanıcı kontrol edip yayınlar
  const [importing, setImporting] = useState(false);
  function applyImport(f: ImportedFields) {
    if (f.category) setCat(f.category);
    if (f.brand) setBrand(canonicalBrand(f.brand));
    if (f.model) setModel(f.model);
    if (f.year) setYear(String(f.year));
    if (f.usage_value != null) setUsage(String(f.usage_value));
    if (f.price) setPrice(String(f.price));
    if (f.city) setCity(f.city);
    if (f.description) setDesc(f.description);
    if (f.takas != null) setTakas(f.takas);
    if (f.cond) setCond(f.cond);
    if (f.qty) setQty(String(f.qty));
    if (f.part_group) setGroup(f.part_group);
    if (f.equipment_category) setEquip(f.equipment_category);
    if (f.compat) setCompat(f.compat);
  }
  async function runImport() {
    const assets = await pickScreenshots();
    if (!assets) return;
    setImporting(true);
    const r = await importFromScreenshots(assets);
    setImporting(false);
    if (!r.ok) {
      if (r.error === 'cancelled') return;
      haptic.failure();
      const m = r.error === 'not_listing' ? 'Seçtiğin görüntülerde bir ilan bulamadık. İlan sayfasının ekran görüntülerini seç.'
        : r.error === 'limit' ? 'Bugünkü aktarma hakkın doldu (günde 15). Yarın tekrar deneyebilir ya da formu elle doldurabilirsin.'
        : r.error === 'not_configured' ? 'İlan aktarma şu anda kullanılamıyor. Formu elle doldurabilirsin.'
        : 'Görüntüler okunamadı. Bağlantını kontrol edip tekrar dene.';
      Alert.alert(tr('İlan aktarılamadı'), tr(m));
      return;
    }
    applyImport(r.fields);
    haptic.success();
    const n = filledCount(r.fields);
    Alert.alert(
      tr('Bilgiler dolduruldu'),
      `${n} ${tr('alan dolduruldu. Her alanı kontrol et, eksikleri tamamla ve makinenin kendi fotoğraflarını ekle (ekran görüntüleri fotoğraf olarak eklenmez).')}${r.notes ? `\n\n${r.notes}` : ''}`,
    );
  }
  function startImport() {
    Alert.alert(
      tr('Başka sitedeki ilanını aktar'),
      tr('İlanının ekran görüntülerini seç (en fazla 4): başlık, fiyat, özellikler ve açıklama görünsün. Bilgileri biz doldururuz, sen kontrol edip yayınlarsın. Yalnızca sana ait bir ilanı aktar.'),
      [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr('Ekran görüntüsü seç'), onPress: () => { void runImport(); } }],
    );
  }

  useEffect(() => {
    if (!uid) return;
    void supabase.from('profiles').select('is_premium').eq('id', uid).maybeSingle().then(({ data }) => setPremium(!!(data as { is_premium?: boolean } | null)?.is_premium));
  }, [uid]);

  useEffect(() => {
    if (!uid || !editId) return;
    void supabase.from('listings')
      .select('category,brand,model,year,usage_value,price,city,description,takas,spec,cond,compat,qty,equipment_category,part_group,video_url,video_path,tech,listing_photos(id,path,position)')
      .eq('id', editId).eq('seller_id', uid).maybeSingle().then(({ data }) => {
        const r = data as unknown as Record<string, unknown> | null;
        if (!r) { Alert.alert('İlan', 'İlan bulunamadı.'); router.back(); return; }
        setCat(String(r.category ?? '')); setBrand(String(r.brand ?? '')); setModel(String(r.model ?? ''));
        setYear(r.year ? String(r.year) : ''); setUsage(r.usage_value != null ? String(r.usage_value) : ''); setPrice(String(r.price ?? ''));
        setCity(String(r.city ?? '')); setDesc(String(r.description ?? '')); setVideo(String(r.video_url ?? '')); setTech(Object.fromEntries(Object.entries((r.tech ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v)]))); setOldVideo(r.video_path ? String(r.video_path) : null); setTakas(!!r.takas); setSpec(String(r.spec ?? ''));
        setCond(String(r.cond ?? 'Sıfır')); setCompat(String(r.compat ?? '')); setQty(r.qty ? String(r.qty) : '1');
        setEquip(String(r.equipment_category ?? '')); setGroup(String(r.part_group ?? ''));
        const ph = ((r.listing_photos ?? []) as { id: string; path: string; position: number }[]).sort((a, b) => a.position - b.position);
        setExisting(ph.map((p) => ({ id: p.id, path: p.path })));
        setLoadedEdit(true);
      });
  }, [uid, editId]);

  // Otomatik taslak (yalnızca yeni ilanda): bağlantı kopsa veya uygulama kapansa da emek kaybolmasın.
  const draftKey = uid && !editId ? `mk-listing-draft:${uid}` : null;
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    if (!draftKey) { setDraftReady(true); return; }
    let alive = true;
    void AsyncStorage.getItem(draftKey).then((raw) => {
      if (!alive) return;
      let d: Record<string, unknown> | null = null;
      try { d = raw ? JSON.parse(raw) as Record<string, unknown> : null; } catch { d = null; }
      if (!d || !d.cat) { setDraftReady(true); return; }
      const apply = () => {
        const str = (k: string) => (typeof d![k] === 'string' ? d![k] as string : '');
        setCat(str('cat')); setBrand(str('brand')); setModel(str('model')); setYear(str('year')); setUsage(str('usage')); setPrice(str('price'));
        setCity(str('city')); setDesc(str('desc')); setTakas(!!d!.takas); setVideo(str('video')); setSpec(str('spec')); setCond(str('cond') || 'Sıfır');
        setCompat(str('compat')); setQty(str('qty') || '1'); setEquip(str('equip')); setGroup(str('group'));
        if (d!.tech && typeof d!.tech === 'object') setTech(d!.tech as Record<string, string>);
        if (Array.isArray(d!.photos)) setPhotos((d!.photos as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 30));
      };
      Alert.alert(tr('Kaydedilmemiş ilan'), tr('Yarım kalmış bir ilan taslağın var. Kaldığın yerden devam etmek ister misin?'), [
        { text: tr('Sil'), style: 'destructive', onPress: () => { void AsyncStorage.removeItem(draftKey).catch(() => {}); setDraftReady(true); } },
        { text: tr('Devam et'), onPress: () => { apply(); setDraftReady(true); } },
      ]);
    }).catch(() => setDraftReady(true));
    return () => { alive = false; };
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || !draftReady || busy) return;
    const t = setTimeout(() => {
      const d = { cat, brand, model, year, usage, price, city, desc, takas, video, spec, cond, compat, qty, equip, group, tech, photos, at: Date.now() };
      if (!cat && !brand && !model && !desc && !photos.length) void AsyncStorage.removeItem(draftKey).catch(() => {});
      else void AsyncStorage.setItem(draftKey, JSON.stringify(d)).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [draftKey, draftReady, busy, cat, brand, model, year, usage, price, city, desc, takas, video, spec, cond, compat, qty, equip, group, tech, photos]);
  const clearDraft = () => { if (draftKey) void AsyncStorage.removeItem(draftKey).catch(() => {}); };

  const part = cat === 'Yedek parça' || cat === 'Lastik ve jant';
  const kind = !cat ? '' : cat === 'Yedek parça' ? 'part' : cat === 'Lastik ve jant' ? 'tire' : 'machine';
  const unit = KM_CATEGORIES.has(cat) ? 'km' : 'saat';
  const maxPhotos = premium ? LIMITS.prem.photos : LIMITS.free.photos;

  async function pick(camera: boolean) {
    const room = maxPhotos - photos.length - existing.length;
    if (room <= 0) { Alert.alert('Fotoğraf', `En fazla ${maxPhotos} fotoğraf ekleyebilirsin.`); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('İzin gerekli', 'Fotoğraf eklemek için izin vermelisin. Telefon ayarlarından değiştirebilirsin.'); return; }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.9 });
    if (res.canceled) return;
    // Yüklemeden önce küçültülür (uzun kenar 1600 px): yükleme hızlanır, kalite farkı görülmez
    const small = await Promise.all(res.assets.map((x) => shrinkPhoto(x.uri, x.width, x.height)));
    setPhotos((cur) => [...cur, ...small].slice(0, maxPhotos - existing.length));
  }

  const MAX_VIDEO_MB = 50;
  async function pickVideo(camera: boolean) {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(tr('İzin gerekli'), tr('Video eklemek için izin vermelisin. Telefon ayarlarından değiştirebilirsin.')); return; }
    const opts = { mediaTypes: ['videos'] as ImagePicker.MediaType[], videoMaxDuration: 60, allowsEditing: true, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.duration && a.duration > 61000) { Alert.alert(tr('Video'), tr('Video en fazla 60 saniye olabilir. Kırpıp tekrar seç.')); return; }
    if (a.fileSize && a.fileSize > MAX_VIDEO_MB * 1024 * 1024) { Alert.alert(tr('Video'), tr('Video 50 MB\'tan büyük. Daha kısa bir video seç.')); return; }
    const mov = (a.mimeType ?? '').includes('quicktime') || /\.mov$/i.test(a.uri);
    setVideoFile({ uri: a.uri, ext: mov ? 'mov' : 'mp4', mime: mov ? 'video/quicktime' : 'video/mp4', size: a.fileSize ?? null, duration: a.duration ?? null });
  }

  /** Videoyu yükler ve ilana bağlar. Başarısızsa false (ilan yine de yayına alınır). */
  async function uploadVideo(listingId: string): Promise<boolean> {
    if (!uid) return false;
    const old = oldVideo && (videoFile || dropOldVideo) ? oldVideo : null;
    if (videoFile) {
      setProgress(tr('Video yükleniyor…'));
      try {
        const buf = await (await fetch(videoFile.uri)).arrayBuffer();
        if (buf.byteLength > MAX_VIDEO_MB * 1024 * 1024) return false;
        const path = `${uid}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${videoFile.ext}`;
        const up = await supabase.storage.from('listing-videos').upload(path, buf, { contentType: videoFile.mime });
        if (up.error) return false;
        const link = await supabase.from('listings').update({ video_path: path }).eq('id', listingId).eq('seller_id', uid);
        if (link.error) { await supabase.storage.from('listing-videos').remove([path]); return false; }
      } catch { return false; }
    } else if (dropOldVideo) {
      await supabase.from('listings').update({ video_path: null }).eq('id', listingId).eq('seller_id', uid);
    }
    if (old) await supabase.storage.from('listing-videos').remove([old]);
    return true;
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
    const videoUrl = normalizeVideoUrl(video);
    if (videoUrl === null) return setError('Video bağlantısı YouTube veya Vimeo bağlantısı olmalı.');
    if (photos.length + existing.length === 0) return setError('En az 1 fotoğraf ekle. Alıcılar fotoğrafsız ilanlara güvenmez.');
    if (!pledge && !editId) return setError('Kapora taahhüdünü onaylaman gerekiyor.');

    // İlan hakkı: bittiyse ek ilan hakkı ya da Premium seçenekleri sorulur (sunucu ayrıca denetler)
    if (!editId) {
      setBusy(true);
      const ok = await ensureListingQuota();
      setBusy(false);
      void fetchQuota().then(setQuota);
      if (!ok) return;
    }
    setBusy(true);
    let id: string | null = null;
    try {
      const base = {
        seller_id: uid, status: 'paused', kind, category: cat, title: `${brand.trim()} ${model.trim()}`, description: desc.trim(), price: priceNum, city,
        year: part ? null : yearNum, usage_value: !part ? Number(usage) : null, usage_unit: !part ? unit : null,
        spec: part ? spec.trim() : null, cond: part ? cond : null, compat: part && compat.trim() ? compat.trim() : null, qty: part ? Number(qty) : null,
        equipment_category: part ? equip : null, part_group: part ? group : null,
        brand: canonicalBrand(brand), model: model.trim(), takas, serial_declared: false,
        video_url: videoUrl || null,
        tech: (() => { const t = cleanTech(cat, tech); return Object.keys(t).length ? t : null; })(),
      };
      const { seller_id: _s, ...changes } = base;
      const created = editId
        ? await supabase.from('listings').update({ ...changes, status: 'paused' }).eq('id', editId).eq('seller_id', uid).select('id').single()
        : await supabase.from('listings').insert(base).select('id').single();
      if (created.error && isQuotaError(created.error.message)) throw new Error('İlan hakkın doldu. Ek ilan hakkı alabilir ya da Premium tarifelere bakabilirsin; taslağın kayıtlı.');
      if (created.error || !created.data) throw new Error(created.error?.message.includes('AUCTION_HAS_BIDS') ? 'Teklif almış açık artırma sürerken ilan düzenlenemez.' : created.error?.message.includes('RATE_LIMIT') ? 'Çok fazla işlem. Bir dakika sonra tekrar dene.' : 'İlan kaydedilemedi. Bilgileri kontrol edip tekrar dene.');
      id = (created.data as { id: string }).id;
      clearDraft(); // ilan oluştu (duraklatılmış da olsa); aynı taslaktan ikinci ilan açılmasın
      if (editId && removed.length) {
        const unlink = await supabase.from('listing_photos').delete().in('id', removed.map((p) => p.id));
        if (unlink.error) throw new Error('Eski fotoğraflar kaldırılamadı. İlan yayına alınmadı.');
        await supabase.storage.from('listing-photos').remove(removed.map((p) => p.path));
      }
      for (let i = 0; i < existing.length; i++) await supabase.from('listing_photos').update({ position: i }).eq('id', existing[i].id);
      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Fotoğraflar yükleniyor (${i + 1}/${photos.length})…`);
        try {
          const buf = await (await fetch(photos[i])).arrayBuffer();
          const path = `${uid}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
          const up = await supabase.storage.from('listing-photos').upload(path, buf, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          const link = await supabase.from('listing_photos').insert({ listing_id: id, path, position: existing.length + i });
          if (link.error) { await supabase.storage.from('listing-photos').remove([path]); throw link.error; }
        } catch { failed++; }
      }
      if (failed > 0) {
        Alert.alert('İlan', `${failed} fotoğraf yüklenemedi. İlanın duraklatılmış olarak saklandı; İlanlarım'dan kontrol edebilirsin.`);
        router.replace('/ilanlarim');
        return;
      }
      const videoOk = await uploadVideo(id);
      const published = await supabase.from('listings').update({ status: 'active' }).eq('id', id).eq('seller_id', uid);
      if (published.error) throw new Error('İlan kaydedildi ancak yayına alınamadı. İlanlarım ekranından "Yayına al" ile tekrar dene.');
      if (videoOk) { haptic.success(); toast('İlan incelemeye gönderildi. Onaylandığında yayımlanacak.'); void maybeAskReview('published', 2500); }
      else Alert.alert('İlan', 'İlan incelemeye gönderildi ancak video yüklenemedi. İlanı düzenleyip videoyu tekrar ekleyebilirsin.');
      router.replace('/ilanlarim');
    } catch (e) {
      setError(friendlyError(e, 'Bir hata oluştu. Tekrar dene.'));
      if (id) router.replace('/ilanlarim');
    } finally { setBusy(false); setProgress(''); }
  }

  if (!session) return <GuestGate icon="plus-square" text="İlan vermek için giriş yap. Hesabın yoksa uygulamadan ücretsiz kayıt olabilirsin." />;
  if (!loadedEdit) return <FormSkeleton />;
  const field = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={set} {...extra} /></View>
  );
  const select = (label: string, value: string, open: Sheet) => (
    <View style={s.field}><Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, s.select]} onPress={() => setSheet(open)} accessibilityRole="button">
        <Text style={{ flex: 1, fontSize: 16, color: value ? color.ink : color.muted }} numberOfLines={1}>{value || 'Seç'}</Text>
        <Icon name="chevron-down" size={18} color={color.muted} />
      </Pressable>
    </View>
  );
  const techInput = (f: TechField) => (
    <View key={f.key} style={s.field}>
      <Text style={s.label}>{f.unit ? `${tr(f.label)} (${f.unit})` : f.label}</Text>
      {f.type === 'select' ? (
        <View style={s.chips}>
          {(f.options ?? []).map((o) => {
            const on = tech[f.key] === o;
            return (
              <Pressable hitSlop={6} key={o} style={[s.chip, on && s.chipOn]} onPress={() => setTech((t) => ({ ...t, [f.key]: on ? '' : o }))} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <Text style={[s.chipT, on && { color: color.tealInk }]}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput style={s.input} value={tech[f.key] ?? ''} onChangeText={(v) => setTech((t) => ({ ...t, [f.key]: v }))} keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'} maxLength={f.type === 'number' ? 10 : 60} />
      )}
    </View>
  );
  const section = (title: string, icon: IconName, children: ReactNode) => (
    <View style={s.card}>
      <View style={s.cardHead}><View style={s.cardIcon}><Icon name={icon} size={17} color={color.tealText} /></View><Text style={s.cardT}>{title}</Text></View>
      {children}
    </View>
  );
  const total = photos.length + existing.length;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior="padding">
      <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {!editId ? (
          <Pressable style={({ pressed }) => [s.importCard, pressed && { opacity: 0.85 }]} onPress={startImport} disabled={importing} accessibilityRole="button" accessibilityState={{ busy: importing }}>
            <View style={s.importIcon}>{importing ? <ActivityIndicator color={color.tealText} /> : <Icon name="download" size={20} color={color.tealText} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={s.importT}>{importing ? 'Ekran görüntüleri okunuyor…' : 'Başka sitedeki ilanını aktar'}</Text>
              <Text style={s.importS}>Ekran görüntülerini seç, bilgileri biz dolduralım</Text>
            </View>
            {importing ? null : <Icon name="chevron-right" size={18} color={color.muted} />}
          </Pressable>
        ) : null}
        {!editId && quota ? (
          <Pressable style={({ pressed }) => [s.quota, pressed && { opacity: 0.8 }]} onPress={() => router.push('/premium')} accessibilityRole="button">
            <Icon name="layers" size={16} color={quota.remaining + quota.credits > 0 ? color.tealText : color.bad} />
            <PlainText style={[s.quotaT, quota.remaining + quota.credits === 0 && { color: color.bad }]}>{quotaLine(quota, lang)}</PlainText>
            <Icon name="chevron-right" size={16} color={color.muted} />
          </Pressable>
        ) : null}
        {section('Ne satıyorsun?', 'tag', <>
          {select('Kategori', cat, 'cat')}
          {part ? (
            <>
              {select('Hangi makine / araç için', equip, 'equip')}
              {select('Parça grubu', PART_GROUPS.find((g) => g.id === group)?.label ?? '', 'group')}
            </>
          ) : null}
          {select('Marka', brand, 'brand')}
          {field(part ? 'Ürün adı' : 'Model', model, setModel)}
        </>)}

        {section('Ayrıntılar', 'sliders', part ? (
          <>
            {field(cat === 'Lastik ve jant' ? 'Lastik ebadı' : 'Parça numarası', spec, setSpec)}
            {select('Durum', cond, 'cond')}
            {field('Uyumlu makine veya araç (isteğe bağlı)', compat, setCompat)}
            {field('Adet', qty, setQty, { keyboardType: 'number-pad' })}
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>{field('Model yılı', year, setYear, { keyboardType: 'number-pad', maxLength: 4 })}</View>
            <View style={{ flex: 1 }}>{field(unit === 'km' ? 'Kilometre' : 'Çalışma saati', usage, setUsage, { keyboardType: 'number-pad' })}</View>
          </View>
        ))}

        {!part && techFieldsFor(cat).length ? section('Teknik özellikler', 'sliders', <>
          <Text style={s.hint}>Alıcılar makineyi bu bilgilere göre filtreler. Bildiklerini doldur; boş bırakılan alanlar ilanda görünmez.</Text>
          {techFieldsFor(cat).map(techInput)}
        </>) : null}

        {!part && cat ? section('Bakım ve durum (satıcı beyanı)', 'clipboard', <>
          <Text style={s.hint}>Bu bilgiler ilanda "Satıcı beyanı" olarak gösterilir. Doğru beyan güven oluşturur.</Text>
          {CONDITION_FIELDS.map(techInput)}
        </>) : null}

        {section('Fiyat ve konum', 'map-pin', <>
          {field(part ? 'Birim fiyat (₺)' : 'Fiyat (₺)', price, setPrice, { keyboardType: 'decimal-pad' })}
          {select('İl', city, 'city')}
          <View style={s.rowSwitch}><Text style={s.switchT}>Takas olur</Text><Switch value={takas} onValueChange={setTakas} trackColor={{ true: color.teal, false: color.plate }} /></View>
        </>)}

        {section('Açıklama', 'file-text',
          <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }]} value={desc} onChangeText={setDesc} multiline maxLength={4000} placeholder="Durumu, bakım geçmişi, ekipmanlar, hasar bilgisi…" />,
        )}

        {section('Video (isteğe bağlı)', 'video', <>
          <Text style={s.hint}>Makinenin çalışırken çekilmiş kısa bir videosu alıcıların güvenini artırır. En fazla 60 saniye.</Text>
          {videoFile || (oldVideo && !dropOldVideo) ? (
            <View style={s.videoRow}>
              <View style={s.videoIcon}><Icon name="film" size={20} color={color.tealInk} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.videoT}>{videoFile ? 'Video seçildi' : 'İlanda video var'}</Text>
                {videoFile ? <PlainText style={s.hint}>{[videoFile.duration ? `${Math.round(videoFile.duration / 1000)} sn` : '', videoFile.size ? `${(videoFile.size / 1048576).toFixed(1).replace('.', ',')} MB` : ''].filter(Boolean).join(' · ')}</PlainText> : null}
              </View>
              <Pressable hitSlop={8} onPress={() => { if (videoFile) setVideoFile(null); else setDropOldVideo(true); }} accessibilityRole="button" accessibilityLabel={tr('Videoyu kaldır')}>
                <Icon name="trash-2" size={19} color={color.bad} />
              </Pressable>
            </View>
          ) : !premium ? (
            <Pressable style={({ pressed }) => [s.videoRow, pressed && { opacity: 0.85 }]} onPress={() => router.push('/premium')} accessibilityRole="button">
              <View style={s.videoIcon}><Icon name="lock" size={18} color={color.tealInk} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.videoT}>Telefondan video yükleme Pro ve Firma Pro'ya özel</Text>
                <Text style={s.hint}>Ücretsiz üyelikte YouTube bağlantısı ekleyebilirsin.</Text>
              </View>
              <Icon name="chevron-right" size={18} color={color.muted} />
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={s.videoBtn} onPress={() => void pickVideo(true)} accessibilityRole="button"><Icon name="video" size={20} color={color.tealText} /><Text style={s.addT}>Video çek</Text></Pressable>
              <Pressable style={s.videoBtn} onPress={() => void pickVideo(false)} accessibilityRole="button"><Icon name="film" size={20} color={color.tealText} /><Text style={s.addT}>Galeriden seç</Text></Pressable>
            </View>
          )}
          {field('veya YouTube / Vimeo bağlantısı', video, setVideo, { keyboardType: 'url', autoCapitalize: 'none', autoCorrect: false, placeholder: 'https://youtu.be/…', maxLength: 300 })}
        </>)}

        {section(`${tr('Fotoğraflar')} (${total}/${maxPhotos})`, 'camera', <>
          {total > 1 ? <Text style={s.hint}>Kapak yapmak istediğin fotoğrafa dokun.</Text> : null}
          <View style={s.grid}>
            {existing.map((p, i) => (
              <View key={p.id} style={s.tile}>
                <Pressable onPress={() => setExisting((cur) => [p, ...cur.filter((x) => x.id !== p.id)])} accessibilityRole="button" accessibilityLabel={tr('Kapak yap')}>
                  <Image source={{ uri: photoUrl(p.path) }} style={s.thumb} />
                </Pressable>
                {i === 0 ? <View style={s.cover}><Text style={s.coverT}>Kapak</Text></View> : null}
                <Pressable style={s.x} onPress={() => { setExisting((cur) => cur.filter((x) => x.id !== p.id)); setRemoved((cur) => [...cur, p]); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Fotoğrafı kaldır')}><Icon name="x" size={14} color={fixed.onMedia} /></Pressable>
              </View>
            ))}
            {photos.map((u, i) => (
              <View key={u + i} style={s.tile}>
                <Pressable disabled={existing.length > 0} onPress={() => setPhotos((cur) => [u, ...cur.filter((_, j) => j !== i)])} accessibilityRole="button" accessibilityLabel={tr('Kapak yap')}>
                  <Image source={{ uri: u }} style={s.thumb} />
                </Pressable>
                {existing.length === 0 && i === 0 ? <View style={s.cover}><Text style={s.coverT}>Kapak</Text></View> : null}
                <Pressable style={s.x} onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Fotoğrafı kaldır')}><Icon name="x" size={14} color={fixed.onMedia} /></Pressable>
              </View>
            ))}
            {total < maxPhotos ? (
              <>
                <Pressable style={[s.tile, s.add]} onPress={() => void pick(true)} accessibilityRole="button"><Icon name="camera" size={22} color={color.tealText} /><Text style={s.addT}>Kamera</Text></Pressable>
                <Pressable style={[s.tile, s.add]} onPress={() => void pick(false)} accessibilityRole="button"><Icon name="image" size={22} color={color.tealText} /><Text style={s.addT}>Galeri</Text></Pressable>
              </>
            ) : null}
          </View>
        </>)}

        {!editId ? (
          <View style={[s.card, s.rowSwitch]}>
            <Icon name="shield" size={20} color={color.tealText} />
            <Text style={[s.switchT, { fontSize: 14.5 }]}>Ürünü görmeden kapora, ön ödeme, havale veya EFT istemeyeceğimi taahhüt ederim.</Text>
            <Switch value={pledge} onValueChange={setPledge} trackColor={{ true: color.teal, false: color.plate }} />
          </View>
        ) : null}
        {error ? <Text style={s.err} accessibilityRole="alert">{error}</Text> : null}
        {progress ? <Text style={s.small}>{progress}</Text> : null}
        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()} accessibilityRole="button">
          {busy ? <ActivityIndicator color={color.tealInk} /> : <><Icon name="send" size={18} color={color.tealInk} /><Text style={s.btnText}>{editId ? 'Değişiklikleri gönder' : 'İlanı gönder'}</Text></>}
        </Pressable>
        <Text style={[s.small, { textAlign: 'center' }]}>Yeni ilanlar yayına girmeden önce incelenir.</Text>
      </ScrollView>

      <PickerModal visible={sheet === 'brand'} title="Marka" searchable allowCustom selected={brand} options={brandsForCategory(part ? equip : cat).map((b) => ({ value: b, label: b }))} onPick={setBrand} onClose={() => setSheet(null)} />
        <PickerModal visible={sheet === 'cat'} title="Kategori" selected={cat} options={CATEGORIES.map((c) => ({ value: c, label: c }))} onPick={setCat} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={setCity} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'equip'} title="Makine / araç türü" selected={equip} options={MACHINE_CATEGORIES.map((c) => ({ value: c, label: c }))} onPick={setEquip} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'group'} title="Parça grubu" selected={group} options={PART_GROUPS.map((g) => ({ value: g.id, label: g.label }))} onPick={setGroup} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'cond'} title="Durum" selected={cond} options={CONDITIONS.map((c) => ({ value: c, label: c }))} onPick={setCond} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  importCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius + 4, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  importIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.tealSoft },
  importT: { color: color.ink, fontFamily: font.semi, fontSize: 16 },
  importS: { color: color.muted, fontSize: 13.5, marginTop: 2 },
  quota: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: radius, backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  quotaT: { flex: 1, color: color.ink, fontFamily: font.medium, fontSize: 14 },
  hint: { color: color.muted, fontSize: 12.5, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: color.teal, borderColor: color.teal },
  chipT: { color: color.ink, fontFamily: font.semi, fontSize: 14 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius, backgroundColor: color.tealSoft },
  videoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  videoT: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
  videoBtn: { flex: 1, minHeight: 56, borderRadius: radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.teal, alignItems: 'center', justifyContent: 'center', gap: 4 },
  form: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 12, ...shadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  cardT: { fontFamily: font.bold, fontSize: 17, color: color.ink },
  field: { gap: 6 },
  label: { fontFamily: font.semi, fontSize: 14, color: color.muted },
  input: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line, color: color.ink },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchT: { flex: 1, color: color.ink, fontSize: 15.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: 96, height: 96, borderRadius: radius, overflow: 'hidden' },
  thumb: { width: 96, height: 96, backgroundColor: color.plate },
  cover: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  coverT: { color: fixed.onMedia, fontSize: 11, fontWeight: '700' },
  x: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  add: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.teal, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addT: { color: color.tealText, fontFamily: font.semi, fontSize: 13 },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: color.teal, minHeight: 54, borderRadius: radius + 2, alignItems: 'center', justifyContent: 'center', ...shadow },
  btnText: { color: color.tealInk, fontFamily: font.bold, fontSize: 17 },
  err: { color: color.bad, textAlign: 'center' },
  small: { color: color.muted, fontSize: 12.5 },
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
});
