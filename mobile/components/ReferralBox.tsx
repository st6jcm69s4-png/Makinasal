import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './LText';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';

type Row = { inviter_id: string; invitee_id: string; status: 'pending' | 'rewarded' };

export function ReferralBox() {
  const { session } = useApp();
  const me = session?.user.id;
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const [c, r] = await Promise.all([supabase.rpc('my_referral_code'), supabase.from('referrals').select('inviter_id,invitee_id,status')]);
    if (typeof c.data === 'string') setCode(c.data);
    if (r.data) setRows(r.data as Row[]);
  }, [me]);
  useEffect(() => { void load(); }, [load]);

  if (!me) return null;
  const invited = rows.filter((r) => r.inviter_id === me);
  const rewarded = Math.min(invited.filter((r) => r.status === 'rewarded').length, 3);
  const used = rows.some((r) => r.invitee_id === me);

  async function claim() {
    if (!input.trim()) return;
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('claim_referral', { p_code: input });
    setBusy(false);
    if (error) { setMsg(/RATE_LIMIT/.test(error.message) ? 'Çok fazla deneme. Daha sonra tekrar dene.' : error.message); return; }
    Alert.alert('Davet', 'Davet kodu kaydedildi.'); setInput(''); void load();
  }

  return (
    <View style={s.box}>
      <Text style={s.h}>Davet et, ilan hakkı kazan</Text>
      <Text style={s.small}>Davet ettiğin kişinin ilk ilanı onaylanınca +1 ilan hakkı kazanırsın (en fazla 3).</Text>
      <Text>Davet kodun: <Text style={{ fontWeight: '700' }} selectable>{code || '…'}</Text></Text>
      <Text style={s.small}>Davet edilen: {invited.length} · Kazanılan hak: {rewarded}</Text>
      {!used ? (
        <>
          <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Bir davet kodun var mı?" autoCapitalize="characters" maxLength={16} />
          {msg ? <Text style={s.err}>{msg}</Text> : null}
          <Pressable style={s.btn} disabled={busy} onPress={() => void claim()} accessibilityRole="button"><Text style={s.btnText}>Kodu kullan</Text></Pressable>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#fff', borderRadius: 8, padding: 14, gap: 8 },
  h: { fontWeight: '700', fontSize: 16 },
  small: { color: '#666', fontSize: 12 },
  input: { padding: 10, backgroundColor: '#F6F5F3', borderRadius: 8 },
  err: { color: '#b00020' },
  btn: { borderWidth: 1, borderColor: '#800020', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#800020', fontWeight: '600' },
});
