import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from './LText';
import { Btn, common } from './ui';
import { checkMessage } from '../lib/messageFilter';
import { networkError } from '../lib/network';
import { supabase } from '../lib/supabase';

type Msg = { id: string; sender_id: string; body: string; created_at: string };

export function QuoteChat({ quoteId, userId }: { quoteId: string; userId: string }) {
  const [show, setShow] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase.from('market_quote_messages').select('*').eq('quote_id', quoteId).order('created_at', { ascending: false }).limit(50);
    if (r.error) setError('Mesajlar yüklenemedi.');
    else { setError(''); setMsgs(((r.data ?? []) as Msg[]).reverse()); }
  }, [quoteId]);
  useEffect(() => {
    if (!show) return;
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [show, load]);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    const c = checkMessage(body);
    if (c.block) { setError(c.block); return; }
    setBusy(true);
    const r = await supabase.from('market_quote_messages').insert({ quote_id: quoteId, sender_id: userId, body });
    setBusy(false);
    if (r.error) setError(networkError(r.error)); else { setText(''); setError(''); void load(); }
  }
  return (
    <View style={{ gap: 6, marginTop: 6 }}>
      <Btn ghost title={show ? 'Yazışmayı gizle' : 'Teklif yazışması'} onPress={() => setShow(!show)} />
      {show ? (
        <View style={{ gap: 6 }}>
          {msgs.length === 0 ? <Text style={common.meta}>Henüz mesaj yok.</Text> : null}
          {msgs.map((m) => (
            <View key={m.id} style={{ alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start', backgroundColor: m.sender_id === userId ? '#EBD5DA' : '#eee', padding: 8, borderRadius: 8, maxWidth: '85%' }}>
              <Text>{m.body}</Text>
            </View>
          ))}
          <TextInput style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#DDD9DC' }} placeholder="Mesaj yaz" value={text} onChangeText={setText} multiline />
          {error ? <Text style={common.err}>{error}</Text> : null}
          <Btn title="Gönder" onPress={() => void send()} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}
