import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon, type IconName } from '../../components/Icon';
import { GuestGate } from '../../components/LoginPrompt';
import { PickerModal } from '../../components/PickerModal';
import { useApp } from '../../lib/AppContext';
import { CITIES, MACHINE_CATEGORIES } from '../../lib/data';
import { districtsFor } from '../../lib/regions';
import { networkError, PERSONNEL_ROLES } from '../../lib/network';
import { AVAILABILITY, CERTS, LICENSES, WORK_TYPES, isPersonDetails, personSummary, type Availability, type HistoryItem, type PersonDetails } from '../../lib/personProfile';
import { tr } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { color, font, radius, shadow } from '../../lib/theme';

type Role = keyof typeof PERSONNEL_ROLES;
const ROLE_ICON: Record<Role, IconName> = { operator: 'truck', driver: 'navigation', mechanic: 'tool' };
const PAY_UNITS = ['gün', 'ay', 'saat'] as const;
const thisYear = new Date().getFullYear();

/** "Kendini tanıt": operatör, şoför ve ustaların kişisel hizmet ilanı. */
export default function Introduce() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { session } = useApp();
  const uid = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [title, setTitle] = useState('');
  const [machines, setMachines] = useState<string[]>([]);
  const [brands, setBrands] = useState('');
  const [years, setYears] = useState('');
  const [certs, setCerts] = useState<string[]>([]);
  const [licenses, setLicenses] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [avail, setAvail] = useState<Availability>('now');
  const [start, setStart] = useState('');
  const [travel, setTravel] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [pay, setPay] = useState('');
  const [payUnit, setPayUnit] = useState<(typeof PAY_UNITS)[number]>('gün');
  const [birth, setBirth] = useState('');
  const [about, setAbout] = useState('');
  const [sheet, setSheet] = useState<null | 'city' | 'district'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    void (async () => {
      const prof = await supabase.from('profiles').select('full_name,city').eq('id', uid).maybeSingle();
      const p = prof.data as { full_name: string | null; city: string | null } | null;
      setName(p?.full_name ?? '');
      if (!edit && p?.city) setCity(p.city);
      if (edit) {
        const r = await supabase.from('market_posts').select('*').eq('id', edit).eq('owner_id', uid).maybeSingle();
        const post = r.data as Record<string, unknown> | null;
        if (!post) setError('Düzenlenecek ilan bulunamadı.');
        else {
          setRole((post.personnel_role as Role) ?? '');
          setTitle(String(post.title ?? ''));
          setAbout(String(post.description ?? ''));
          setCity(String(post.city ?? ''));
          setDistrict(String(post.district ?? ''));
          setPay(post.price == null ? '' : String(post.price));
          if (PAY_UNITS.includes(post.price_unit as never)) setPayUnit(post.price_unit as never);
          setStart(String(post.start_date ?? ''));
          const d = post.details;
          if (isPersonDetails(d)) {
            setMachines(d.machines); setBrands(d.brands); setYears(String(d.years)); setCerts(d.certs); setLicenses(d.licenses);
            setHistory(d.history); setWorkTypes(d.workTypes); setAvail(d.availability); setTravel(d.travel); setBirth(d.birthYear ? String(d.birthYear) : '');
          }
        }
      }
      setLoading(false);
    })();
  }, [uid, edit]);

  if (!session) return <GuestGate icon="user" text="Kendini tanıtmak için giriş yap." />;
  if (loading) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={color.teal} /></View>;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const setHist = (i: number, k: keyof HistoryItem, v: string) => setHistory((h) => h.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    const y = Number(years);
    const b = birth ? Number(birth) : null;
    const price = pay.trim() ? Number(pay.replace(/\./g, '').replace(',', '.')) : null;
    if (!role) return setError('Ne iş yaptığını seç.');
    if (title.trim().length < 5) return setError('Başlık en az 5 karakter olmalı.');
    if (!machines.length) return setError('En az bir makine veya araç seç.');
    if (!Number.isInteger(y) || y < 0 || y > 60) return setError('Deneyim yılını 0 ile 60 arasında yaz.');
    if (b !== null && (!Number.isInteger(b) || b < thisYear - 80 || b > thisYear - 16)) return setError('Doğum yılını kontrol et.');
    if (!city) return setError('İl seç.');
    if (price !== null && !(price > 0)) return setError('Ücret geçerli bir sayı olmalı ya da boş bırakılmalı.');
    if (avail === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return setError('Başlangıç tarihini YYYY-AA-GG biçiminde yaz (ör. 2026-12-01).');
    if (about.trim().length < 20) return setError('Kendini tanıtan yazı en az 20 karakter olmalı.');
    const details: PersonDetails = {
      v: 1, machines, brands: brands.trim().slice(0, 200), years: y, certs, licenses,
      history: history.filter((h) => h.place.trim() || h.role.trim()).slice(0, 8).map((h) => ({ place: h.place.trim().slice(0, 80), role: h.role.trim().slice(0, 60), period: h.period.trim().slice(0, 30) })),
      workTypes, availability: avail, travel, birthYear: b,
    };
    const data = {
      personnel_role: role, rental_mode: null,
      title: title.trim(), description: about.trim(), category: machines[0], brand: brands.trim().slice(0, 100), model: '',
      city, district, start_date: avail === 'date' ? start : null, end_date: null,
      price, price_unit: payUnit, quantity: 1, specs: personSummary(details), details,
    };
    setBusy(true); setError('');
    const r = edit
      ? await supabase.from('market_posts').update(data).eq('id', edit).eq('owner_id', uid!).select('id').single()
      : await supabase.from('market_posts').insert({ ...data, kind: 'rental_operator', owner_id: uid!, preferred_provider: null }).select('id').single();
    setBusy(false);
    if (r.error) { setError(networkError(r.error)); return; }
    router.replace(`/ag/ilan/${(r.data as { id: string }).id}` as never);
  }

  const section = (t: string, icon: IconName, children: ReactNode, hint?: string) => (
    <View style={s.card}>
      <View style={s.head}><View style={s.headIcon}><Icon name={icon} size={17} color={color.tealText} /></View><Text style={s.headT}>{t}</Text></View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
  const chip = (label: string, on: boolean, onPress: () => void, translate = true) => (
    <Pressable key={label} style={[s.chip, on && s.chipOn]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {on ? <Icon name="check" size={14} color={color.tealInk} /> : null}
      {translate ? <Text style={[s.chipT, on && s.chipTOn]}>{label}</Text> : <PlainText style={[s.chipT, on && s.chipTOn]}>{label}</PlainText>}
    </Pressable>
  );
  const input = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <View style={{ gap: 6, flex: 1 }}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={set} {...extra} /></View>
  );

  return (
    <KeyboardAvoidingView style={s.screen} behavior="padding">
      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <View style={s.intro}>
          <Text style={s.introT}>İşverenler seni burada tanısın</Text>
          <Text style={s.introS}>Kullanabildiğin makineleri, deneyimini ve belgelerini yaz. Telefon numaran ilanda görünmez; işverenler sana mesajla ulaşır.</Text>
        </View>

        {section('Ne iş yapıyorsun?', 'briefcase', <>
          <View style={s.roles}>
            {(Object.keys(PERSONNEL_ROLES) as Role[]).map((k) => (
              <Pressable key={k} style={[s.role, role === k && s.roleOn]} onPress={() => setRole(k)} accessibilityRole="button" accessibilityState={{ selected: role === k }}>
                <Icon name={ROLE_ICON[k]} size={20} color={role === k ? color.tealInk : color.tealText} />
                <Text style={[s.roleT, role === k && { color: color.tealInk }]} numberOfLines={2}>{PERSONNEL_ROLES[k]}</Text>
              </Pressable>
            ))}
          </View>
          {input('Başlık', title, setTitle, { placeholder: 'ör. 10 yıllık ekskavatör operatörü', maxLength: 120 })}
        </>)}

        {section('Kullanabildiğin makineler', 'truck', <>
          <View style={s.chips}>{MACHINE_CATEGORIES.map((m) => chip(m, machines.includes(m), () => toggle(machines, setMachines, m)))}</View>
          {input('Kullandığın markalar (isteğe bağlı)', brands, setBrands, { placeholder: 'ör. CAT, Komatsu, Hitachi', maxLength: 200 })}
        </>, 'Birden fazla seçebilirsin.')}

        {section('Deneyim ve belgeler', 'award', <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {input('Deneyim (yıl)', years, setYears, { keyboardType: 'number-pad', maxLength: 2, placeholder: 'ör. 8' })}
            {input('Doğum yılı (isteğe bağlı)', birth, setBirth, { keyboardType: 'number-pad', maxLength: 4, placeholder: 'ör. 1990' })}
          </View>
          <Text style={s.label}>Belgeler</Text>
          <View style={s.chips}>{CERTS.map((c) => chip(c, certs.includes(c), () => toggle(certs, setCerts, c)))}</View>
          <Text style={s.label}>Ehliyet sınıfları</Text>
          <View style={s.chips}>{LICENSES.map((c) => chip(c, licenses.includes(c), () => toggle(licenses, setLicenses, c), false))}</View>
        </>)}

        {section('Geçmiş işlerin', 'clock', <>
          {history.map((h, i) => (
            <View key={i} style={s.hist}>
              <View style={s.histHead}>
                <PlainText style={s.histN}>{`${i + 1}.`}</PlainText>
                <Pressable onPress={() => setHistory((x) => x.filter((_, j) => j !== i))} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Kaldır')}><Icon name="trash-2" size={17} color={color.bad} /></Pressable>
              </View>
              {input('Firma veya proje', h.place, (v) => setHist(i, 'place', v), { placeholder: 'ör. Kuzey Marmara Otoyolu', maxLength: 80 })}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {input('Görev', h.role, (v) => setHist(i, 'role', v), { placeholder: 'ör. Ekskavatör operatörü', maxLength: 60 })}
                {input('Süre', h.period, (v) => setHist(i, 'period', v), { placeholder: 'ör. 2019–2023', maxLength: 30 })}
              </View>
            </View>
          ))}
          {history.length < 8 ? (
            <Pressable style={s.add} onPress={() => setHistory((x) => [...x, { place: '', role: '', period: '' }])} accessibilityRole="button">
              <Icon name="plus" size={18} color={color.tealText} /><Text style={s.addT}>İş ekle</Text>
            </Pressable>
          ) : null}
        </>, 'Çalıştığın firmalar veya projeler güven verir. İsteğe bağlı.')}

        {section('Çalışma tercihlerin', 'calendar', <>
          <Text style={s.label}>Çalışma şekli</Text>
          <View style={s.chips}>{WORK_TYPES.map((w) => chip(w, workTypes.includes(w), () => toggle(workTypes, setWorkTypes, w)))}</View>
          <Text style={s.label}>Ne zaman başlayabilirsin?</Text>
          <View style={s.chips}>{(Object.keys(AVAILABILITY) as Availability[]).map((k) => chip(AVAILABILITY[k], avail === k, () => setAvail(k)))}</View>
          {avail === 'date' ? input('Başlangıç tarihi (YYYY-AA-GG)', start, setStart, { placeholder: '2026-12-01', autoCapitalize: 'none', maxLength: 10 }) : null}
          <View style={s.switchRow}><Text style={s.switchT}>Şehir dışına çıkabilirim</Text><Switch value={travel} onValueChange={setTravel} trackColor={{ true: color.teal, false: color.plate }} /></View>
        </>)}

        {section('Konum ve ücret', 'map-pin', <>
          <View style={{ gap: 6 }}>
            <Text style={s.label}>İl</Text>
            <Pressable style={[s.input, s.select]} onPress={() => setSheet('city')} accessibilityRole="button"><Text style={{ flex: 1, fontSize: 16, color: city ? color.ink : color.muted }}>{city || 'Seç'}</Text><Icon name="chevron-down" size={18} color={color.muted} /></Pressable>
          </View>
          {city && districtsFor(city).length ? (
            <View style={{ gap: 6 }}>
              <Text style={s.label}>İlçe (isteğe bağlı)</Text>
              <Pressable style={[s.input, s.select]} onPress={() => setSheet('district')} accessibilityRole="button"><Text style={{ flex: 1, fontSize: 16, color: district ? color.ink : color.muted }}>{district || 'Seç'}</Text><Icon name="chevron-down" size={18} color={color.muted} /></Pressable>
            </View>
          ) : null}
          {input('Ücret beklentisi (₺, boş bırakırsan "görüşülür")', pay, setPay, { keyboardType: 'decimal-pad', placeholder: 'ör. 3500' })}
          <View style={s.chips}>{PAY_UNITS.map((u) => chip(u === 'gün' ? 'Günlük' : u === 'ay' ? 'Aylık' : 'Saatlik', payUnit === u, () => setPayUnit(u)))}</View>
        </>)}

        {section('Kendini tanıt', 'user', <>
          {name ? <PlainText style={s.name}>{name}</PlainText> : null}
          <TextInput style={[s.input, { minHeight: 130, textAlignVertical: 'top', paddingTop: 12 }]} value={about} onChangeText={setAbout} multiline maxLength={2000} placeholder="Kendinden, iş disiplininden ve güçlü yönlerinden kısaca bahset." />
        </>, 'Adın profilinden alınır. T.C. kimlik numarası, adres veya telefon yazma.')}

        {error ? <Text style={s.err} accessibilityRole="alert">{error}</Text> : null}
        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void save()} accessibilityRole="button">
          {busy ? <ActivityIndicator color={color.tealInk} /> : <><Icon name="send" size={18} color={color.tealInk} /><Text style={s.btnT}>{edit ? 'Değişiklikleri kaydet' : 'Yayınla'}</Text></>}
        </Pressable>
      </ScrollView>
      <PickerModal visible={sheet === 'city'} title="İl" selected={city} options={CITIES.map((c) => ({ value: c, label: c }))} onPick={(v) => { setCity(v); setDistrict(''); }} onClose={() => setSheet(null)} />
      <PickerModal visible={sheet === 'district'} title="İlçe" selected={district} options={[{ value: '', label: 'Belirtme' }, ...districtsFor(city).map((d) => ({ value: d, label: d }))]} onPick={setDistrict} onClose={() => setSheet(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  form: { padding: 16, gap: 14, paddingBottom: 48 },
  intro: { gap: 4, paddingHorizontal: 4 },
  introT: { fontFamily: font.bold, fontSize: 22, color: color.ink },
  introS: { color: color.muted, fontSize: 14.5, lineHeight: 20 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 12, ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  headT: { fontFamily: font.bold, fontSize: 17, color: color.ink },
  hint: { color: color.muted, fontSize: 13.5, marginTop: -4 },
  label: { fontFamily: font.semi, fontSize: 14, color: color.muted },
  input: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line, color: color.ink },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roles: { flexDirection: 'row', gap: 8 },
  role: { flex: 1, minHeight: 74, padding: 10, gap: 6, borderRadius: radius, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.bg, justifyContent: 'center' },
  roleOn: { backgroundColor: color.teal, borderColor: color.teal },
  roleT: { color: color.ink, fontFamily: font.semi, fontSize: 13.5, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingHorizontal: 13, borderRadius: 19, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg },
  chipOn: { backgroundColor: color.teal, borderColor: color.teal },
  chipT: { color: color.ink, fontSize: 14 },
  chipTOn: { color: color.tealInk, fontFamily: font.semi },
  hist: { gap: 10, padding: 12, borderRadius: radius, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  histN: { fontFamily: font.bold, color: color.tealText, fontSize: 15 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.teal, backgroundColor: color.tealSoft },
  addT: { color: color.tealText, fontFamily: font.semi, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchT: { flex: 1, color: color.ink, fontSize: 15.5 },
  name: { color: color.ink, fontFamily: font.bold, fontSize: 16 },
  err: { color: color.bad, textAlign: 'center' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: color.teal, minHeight: 54, borderRadius: radius + 2, alignItems: 'center', justifyContent: 'center', ...shadow },
  btnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 17 },
});
