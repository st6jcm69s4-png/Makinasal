import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { RowSkeleton } from '../../components/kit';
import { toast } from '../../components/Toast';
import { useApp } from '../../lib/AppContext';
import { getLang, localeOf, tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { supabase } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

/** Makine karnesi: ilan sahibi bakım kayıtlarını ekler / siler. Kayıtlar ilanda "Satıcı beyanı" olarak görünür. */
export type ServiceLog = { id: string; done_on: string; usage_value: number | null; work: string };
export const fmtLogDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };

/** "GG.AA.YYYY" → "YYYY-AA-GG" (geçersizse null) */
function parseDate(v: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v.trim());
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1980 || dt.getTime() > Date.now() + 86400000) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const today = () => { const n = new Date(); return `${String(n.getDate()).padStart(2, '0')}.${String(n.getMonth() + 1).padStart(2, '0')}.${n.getFullYear()}`; };

export default function ServiceLogScreen() {
  const { id, title, unit } = useLocalSearchParams<{ id: string; title?: string; unit?: string }>();
  const { session } = useApp();
  useLang();
  const [rows, setRows] = useState<ServiceLog[] | null>(null);
  const [date, setDate] = useState(today());
  const [usage, setUsage] = useState('');
  const [work, setWork] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const u = unit === 'km' ? 'km' : tr('saat');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('listing_service_logs').select('id,done_on,usage_value,work').eq('listing_id', id).order('done_on', { ascending: false }).limit(100);
    if (error) { setErr(tr('Kayıtlar yüklenemedi. Tekrar dene.')); setRows([]); return; }
    setRows((data ?? []) as ServiceLog[]);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function add() {
    const iso = parseDate(date);
    const w = work.trim();
    if (!iso) { setErr(tr('Tarihi GG.AA.YYYY biçiminde yaz (bugünden ileri olamaz).')); return; }
    if (w.length < 3) { setErr(tr('Yapılan işi kısaca yaz.')); return; }
    if (/\d{7,}/.test(w)) { setErr(tr('Bakım kaydına telefon numarası yazılamaz.')); return; }
    const n = usage.trim() ? Number(usage.replace(/\D/g, '')) : null;
    setBusy(true); setErr('');
    const { error } = await supabase.from('listing_service_logs').insert({ listing_id: id, done_on: iso, usage_value: n, work: w.slice(0, 300) });
    setBusy(false);
    if (error) { setErr(/limit/i.test(error.message) ? tr('Bu ilan için bakım kaydı sınırına ulaştın (ücretsiz 50, Pro 100).') : tr('Kayıt eklenemedi. Tekrar dene.')); return; }
    setWork(''); setUsage('');
    toast('Bakım kaydı eklendi.');
    void load();
  }
  const remove = (r: ServiceLog) => Alert.alert(tr('Kaydı sil'), tr('Bu bakım kaydı silinsin mi?'), [
    { text: tr('Vazgeç'), style: 'cancel' },
    { text: tr('Sil'), style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('listing_service_logs').delete().eq('id', r.id);
      if (error) Alert.alert(tr('Kaydı sil'), tr('Kayıt silinemedi. Tekrar dene.')); else void load();
    } },
  ]);
  const nf = (n: number) => n.toLocaleString(localeOf(getLang()));

  if (!session) return <View style={s.screen}><Text style={s.lead}>Bu sayfa için giriş yapmalısın.</Text></View>;
  return (
    <KeyboardAvoidingView style={s.screen} behavior="padding" keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: tr('Makine karnesi') }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }} keyboardShouldPersistTaps="handled">
        {title ? <PlainText style={s.title} numberOfLines={2}>{title}</PlainText> : null}
        <Text style={s.lead}>Yaptırdığın bakımları buraya yaz. Kayıtlar ilanında "Satıcı beyanı" olarak görünür ve alıcıya güven verir.</Text>

        <View style={s.card}>
          <Text style={s.h}>Yeni kayıt</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.k}>Tarih</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="GG.AA.YYYY" keyboardType="numbers-and-punctuation" maxLength={10} accessibilityLabel={tr('Tarih')} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <PlainText style={s.k}>{`${tr('Gösterge')} (${u})`}</PlainText>
              <TextInput style={s.input} value={usage} onChangeText={(v) => setUsage(v.replace(/\D/g, '').slice(0, 7))} placeholder={tr('İsteğe bağlı')} keyboardType="number-pad" accessibilityLabel={tr('Gösterge')} />
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={s.k}>Yapılan iş</Text>
            <TextInput style={[s.input, { height: 84, paddingTop: 10, textAlignVertical: 'top' }]} value={work} onChangeText={setWork} placeholder="Örn. motor yağı ve filtreler değişti" multiline maxLength={300} accessibilityLabel={tr('Yapılan iş')} />
          </View>
          {err ? <PlainText style={s.err} accessibilityRole="alert">{err}</PlainText> : null}
          <Pressable style={({ pressed }) => [s.btn, busy && { opacity: 0.5 }, pressed && { opacity: 0.85 }]} disabled={busy} onPress={() => void add()} accessibilityRole="button">
            <Text style={s.btnT}>{busy ? 'Ekleniyor…' : 'Kaydı ekle'}</Text>
          </Pressable>
        </View>

        <Text style={s.h}>Kayıtlar</Text>
        {rows === null ? <RowSkeleton count={3} /> : null}
        {rows && !rows.length ? <Text style={s.lead}>Henüz bakım kaydı yok. İlk kaydı yukarıdan ekle.</Text> : null}
        {rows?.map((r) => (
          <View key={r.id} style={s.log}>
            <View style={{ flex: 1, gap: 2 }}>
              <PlainText style={s.logD}>{fmtLogDate(r.done_on)}{r.usage_value != null ? ` · ${nf(r.usage_value)} ${u}` : ''}</PlainText>
              <PlainText style={s.logW}>{r.work}</PlainText>
            </View>
            <Pressable onPress={() => remove(r)} hitSlop={8} style={s.del} accessibilityRole="button" accessibilityLabel={tr('Kaydı sil')}>
              <Icon name="trash-2" size={18} color={color.bad} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: color.ink },
  lead: { fontSize: 14.5, lineHeight: 21, color: color.muted },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line, padding: 14, gap: 12 },
  h: { fontFamily: font.bold, fontSize: 18, color: color.ink },
  k: { fontFamily: font.label, fontSize: 12.5, color: color.muted },
  input: { height: 46, borderRadius: radius, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg, paddingHorizontal: 12, fontSize: 15.5, color: color.ink },
  err: { color: color.bad, fontSize: 13.5, lineHeight: 19 },
  btn: { height: 48, borderRadius: radius + 2, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: font.bold, fontSize: 16.5, color: color.tealInk },
  log: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.surface, borderRadius: radius + 2, borderWidth: 1, borderColor: color.line, paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  logD: { fontFamily: font.bold, fontSize: 14.5, color: color.tealText },
  logW: { fontSize: 14.5, lineHeight: 20, color: color.ink },
  del: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
