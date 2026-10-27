import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { Btn, Label } from '../components/ui';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { color, radius } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';

type Req = { id: string; kind: string; status: 'open' | 'done' | 'rejected'; created_at: string };
const KINDS: { kind: string; icon: IconName; title: string; text: string; confirm?: string }[] = [
  { kind: 'export', icon: 'download', title: 'Verimin kopyasını iste', text: 'Hakkında işlenen kişisel verilerin bir dökümünü e-postana göndeririz.' },
  { kind: 'correct', icon: 'edit-3', title: 'Bilgilerimin düzeltilmesini iste', text: 'Yanlış ya da eksik kişisel verini düzelttiririz. Profil bilgilerini kendin de düzenleyebilirsin.' },
  { kind: 'object', icon: 'slash', title: 'İşlenmesine itiraz et', text: 'Verilerinin belirli bir amaçla işlenmesine itiraz edersin.' },
  { kind: 'delete', icon: 'trash-2', title: 'Hesabımın ve verilerimin silinmesini iste', text: 'Hesabın, ilanların ve mesajların silinir. Kanunen saklamamız gereken işlem kayıtları (ör. ödeme) süresi dolana kadar ayrı tutulur.', confirm: 'Hesabın ve verilerin silinmek üzere başvuru alınacak. Bu işlem geri alınamaz. Devam edilsin mi?' },
];
const STATUS = { open: 'Beklemede', done: 'Tamamlandı', rejected: 'Reddedildi' } as const;

export default function Rights() {
  const { session } = useApp();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    if (!session) return;
    const r = await supabase.from('data_requests').select('id,kind,status,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20);
    setReqs((r.data ?? []) as Req[]);
  }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function send(kind: string) {
    setBusy(kind);
    const { error } = await supabase.from('data_requests').insert({ kind, note: note.trim().slice(0, 1000) });
    setBusy('');
    if (error) {
      Alert.alert('Başvuru', error.code === '23505' ? 'Bu başvurun zaten beklemede. En geç 30 gün içinde yanıtlanır.' : 'Başvuru gönderilemedi. Bağlantını kontrol edip tekrar dene.');
      return;
    }
    setNote(''); void load();
    Alert.alert('Başvuru alındı', 'Başvurun kaydedildi. Kanun gereği en geç 30 gün içinde yanıtlanır.');
  }
  function ask(k: (typeof KINDS)[number]) {
    if (!k.confirm) { void send(k.kind); return; }
    Alert.alert('Onay', k.confirm, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, başvur', style: 'destructive', onPress: () => void send(k.kind) }]);
  }

  if (!session) {
    return (
      <View style={s.center}>
        <Text style={s.p}>Veri hakları başvurusu için giriş yapmalısın.</Text>
        <Btn title="Giriş yap" onPress={() => router.navigate('/hesap')} />
      </View>
    );
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View style={s.note}>
        <Text style={s.p}>6698 sayılı KVKK'nın 11. maddesi gereği kişisel verilerinle ilgili aşağıdaki başvuruları yapabilirsin. Başvurular en geç 30 gün içinde yanıtlanır.</Text>
        <Btn ghost title="KVKK aydınlatma metnini oku" onPress={() => openWeb('/hukuki/kvkk')} />
      </View>
      <View style={{ gap: 6 }}>
        <Label>Açıklama (isteğe bağlı)</Label>
        <TextInput style={s.input} multiline value={note} onChangeText={setNote} maxLength={1000} placeholder="Başvurunla ilgili eklemek istediklerin" placeholderTextColor="#9A949A" />
      </View>
      {KINDS.map((k) => (
        <View key={k.kind} style={s.card}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name={k.icon} size={22} color={k.kind === 'delete' ? color.bad : color.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.title}>{k.title}</Text>
              <Text style={s.sub}>{k.text}</Text>
            </View>
          </View>
          <Btn ghost={k.kind !== 'delete'} danger={k.kind === 'delete'} title={busy === k.kind ? 'Gönderiliyor…' : 'Başvur'} disabled={!!busy} onPress={() => ask(k)} />
        </View>
      ))}
      {reqs.length ? (
        <View style={{ gap: 6 }}>
          <Label>Başvurularım</Label>
          <View style={s.list}>
            {reqs.map((r, i) => (
              <View key={r.id} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: color.line }]}>
                <Text style={{ flex: 1, color: color.ink }}>{KINDS.find((k) => k.kind === r.kind)?.title ?? r.kind}</Text>
                <Text style={s.sub}>{new Date(r.created_at).toLocaleDateString('tr-TR')} · {STATUS[r.status]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: color.bg },
  p: { color: color.ink, lineHeight: 21 },
  note: { gap: 10, padding: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderLeftWidth: 3, borderLeftColor: color.navy },
  input: { minHeight: 80, padding: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, textAlignVertical: 'top', fontSize: 16 },
  card: { gap: 12, padding: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius },
  title: { fontSize: 16, fontWeight: '700', color: color.ink },
  sub: { color: color.muted, fontSize: 14 },
  list: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
});
