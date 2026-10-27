import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from './LText';
import { Icon } from './Icon';
import { Label } from './ui';
import { Badge } from './kit';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { color, font, radius } from '../lib/theme';

type Row = { inviter_id: string; invitee_id: string; status: 'pending' | 'rewarded' };
const MAX = 3;

/** Davet kuponu: kod, ilerleme kutuları, paylaş. Kodu olanlar için ayrı bölüm. */
export function ReferralBox() {
  const { session } = useApp();
  const me = session?.user.id;
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [enter, setEnter] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const [c, r] = await Promise.all([supabase.rpc('my_referral_code'), supabase.from('referrals').select('inviter_id,invitee_id,status')]);
    if (typeof c.data === 'string') setCode(c.data);
    if (r.data) setRows(r.data as Row[]);
  }, [me]);
  useEffect(() => { void load(); }, [load]);

  if (!me) return null;
  const invited = rows.filter((r) => r.inviter_id === me);
  const rewarded = Math.min(invited.filter((r) => r.status === 'rewarded').length, MAX);
  const used = rows.some((r) => r.invitee_id === me);

  async function claim() {
    if (!input.trim()) return;
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('claim_referral', { p_code: input });
    setBusy(false);
    if (error) { setMsg(/RATE_LIMIT/.test(error.message) ? 'Çok fazla deneme. Daha sonra tekrar dene.' : error.message); return; }
    Alert.alert('Davet', 'Davet kodu kaydedildi.'); setInput(''); setEnter(false); void load();
  }
  const share = () => { if (code) void Share.share({ message: `Makinasal'a katıl: iş makinesi, kamyon ve yedek parça pazarı. Kayıt olurken davet kodumu gir: ${code}` }); };

  return (
    <View style={s.wrap}>
      <Pressable style={({ pressed }) => [s.top, pressed && { opacity: 0.92 }]} onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={s.gift}><Icon name="gift" size={22} color="#fff" /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>Arkadaşını davet et</Text>
          <Text style={s.lead}>Ücretsiz ilan hakkı kazan</Text>
        </View>
        {rewarded ? <Badge variant="default">{`${rewarded}/${MAX}`}</Badge> : null}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={color.onNavy} />
      </Pressable>
      {open ? (
        <View>
          <View style={s.body}>
            <Text style={s.p}>Davet ettiğin kişinin ilk ilanı onaylanınca <Text style={{ fontWeight: '700' }}>+1 ilan hakkı</Text> kazanırsın. En fazla {MAX} hak kazanabilirsin.</Text>
            <View style={s.progress}>
              <View style={{ flex: 1, gap: 6 }}>
                <Label>Kazanılan ilan hakkı</Label>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {Array.from({ length: MAX }, (_, i) => <View key={i} style={[s.seg, i < rewarded && s.segOn]} />)}
                </View>
              </View>
              <View style={s.nums}>
                <PlainText style={s.num}>{String(rewarded)}<PlainText style={s.of}>/{MAX}</PlainText></PlainText>
                <Text style={s.small}>{invited.length} davet</Text>
              </View>
            </View>
            {showCode ? (
              <View style={s.ticket}>
                <View style={{ flex: 1 }}>
                  <Label style={{ color: color.onNavy }}>Davet kodun</Label>
                  <PlainText style={s.code} selectable>{code || '······'}</PlainText>
                </View>
                <Pressable style={({ pressed }) => [s.share, pressed && { opacity: 0.85 }]} onPress={share} disabled={!code} accessibilityRole="button">
                  <Icon name="share-2" size={18} color="#fff" /><Text style={s.shareText}>Paylaş</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={({ pressed }) => [s.show, pressed && { opacity: 0.88 }]} onPress={() => setShowCode(true)} accessibilityRole="button">
                <Icon name="eye" size={18} color="#fff" /><Text style={s.shareText}>Davet kodumu göster</Text>
              </Pressable>
            )}
          </View>
          {!used ? (
            <View style={s.claim}>
              {enter ? (
                <>
                  <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Davet kodu" placeholderTextColor="#9A949A" autoCapitalize="characters" maxLength={16} />
                  {msg ? <Text style={s.err}>{msg}</Text> : null}
                  <Pressable style={({ pressed }) => [s.use, pressed && { opacity: 0.85 }]} disabled={busy} onPress={() => void claim()} accessibilityRole="button"><Text style={s.useText}>{busy ? 'Kontrol ediliyor…' : 'Kodu kullan'}</Text></Pressable>
                </>
              ) : (
                <Pressable onPress={() => setEnter(true)} hitSlop={8} accessibilityRole="button"><Text style={s.link}>Bir davet kodun var mı?</Text></Pressable>
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, borderRadius: radius, overflow: 'hidden' },
  top: { backgroundColor: color.navy, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  gift: { width: 42, height: 42, borderRadius: radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: font.bold, fontSize: 18 },
  body: { padding: 14, gap: 12 },
  p: { color: color.ink, lineHeight: 21 },
  show: { backgroundColor: color.navy, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius },
  lead: { color: '#F1D5DC', fontSize: 14 },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#5A5C64', padding: 12, backgroundColor: color.navy },
  code: { color: '#fff', fontFamily: font.labelBold, fontSize: 30, letterSpacing: 4 },
  share: { backgroundColor: color.accent, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: radius },
  shareText: { color: '#fff', fontWeight: '700' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  seg: { flex: 1, height: 10, backgroundColor: color.plate, borderWidth: 1, borderColor: color.line },
  segOn: { backgroundColor: color.accent, borderColor: color.accent },
  nums: { alignItems: 'flex-end' },
  num: { fontFamily: font.labelBold, fontSize: 28, color: color.ink, lineHeight: 30 },
  of: { fontFamily: font.label, fontSize: 18, color: color.muted },
  small: { color: color.muted, fontSize: 12.5 },
  claim: { borderTopWidth: 1, borderTopColor: color.line, padding: 12, gap: 8 },
  input: { padding: 11, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line, borderRadius: radius, fontSize: 16 },
  err: { color: color.bad },
  use: { backgroundColor: color.navy, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius },
  useText: { color: '#fff', fontWeight: '700' },
  link: { color: color.accent, fontWeight: '600' },
});
