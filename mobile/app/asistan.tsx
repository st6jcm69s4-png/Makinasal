import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { useApp } from '../lib/AppContext';
import { tr } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { PLANS, activePlan, type PlanId } from '../lib/plans';
import { color, font, radius, shadow } from '../lib/theme';

type Msg = { role: 'user' | 'assistant'; content: string };
const STARTERS: [IconName, string][] = [
  ['user', 'Profilimi ve firma profilimi nasıl güçlendirebilirim?'],
  ['trending-up', 'İlanlarımı nasıl daha hızlı satarım?'],
  ['users', 'Operatör veya usta nasıl bulurum?'],
  ['briefcase', 'Bölgemde nasıl daha çok iş bulurum?'],
  ['search', 'Aradığım makine veya parçayı nasıl bulurum?'],
];

async function errorCode(err: unknown): Promise<string> {
  try {
    const ctx = (err as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const b = ctx?.json ? await ctx.json() : null;
    return b?.error ?? 'unknown';
  } catch { return 'unknown'; }
}

export default function Assistant() {
  const { session } = useApp();
  const [plan, setPlan] = useState<PlanId | null | undefined>(undefined);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (!session) { setPlan(null); return; }
    const uid = session.user.id;
    const month = new Date(); month.setUTCDate(1);
    void Promise.all([
      supabase.from('profiles').select('is_premium,premium_plan,premium_until').eq('id', uid).maybeSingle(),
      supabase.from('ai_usage').select('used').eq('user_id', uid).eq('month', month.toISOString().slice(0, 10)).maybeSingle(),
    ]).then(([p, u]) => {
      const pl = activePlan(p.data as never);
      setPlan(pl);
      if (pl) setUsage({ used: (u.data as { used?: number } | null)?.used ?? 0, limit: PLANS.find((x) => x.id === pl)!.aiLimit });
    });
  }, [session]);

  async function send(raw: string) {
    const q = raw.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setText(''); setErr(''); setBusy(true);
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { messages: next } });
    if (error || !data?.reply) {
      const code = error ? await errorCode(error) : 'unknown';
      setErr(code === 'quota' ? tr('Bu ayki soru hakkın doldu. Yeni ayda yenilenir.')
        : code === 'not_premium' ? tr('Asistan premium üyelere özeldir.')
        : code === 'global_limit' ? tr('Asistan bu ay çok yoğun. Kısa süre sonra tekrar dene.')
        : code === 'not_configured' ? tr('Asistan henüz etkinleştirilmedi. Kısa süre sonra tekrar dene.')
        : tr('Yanıt alınamadı. Bağlantını kontrol edip tekrar dene.'));
      setMsgs(msgs);
      setText(q);
    } else {
      setMsgs([...next, { role: 'assistant', content: String(data.reply) }]);
      if (typeof data.used === 'number' && typeof data.limit === 'number') setUsage({ used: data.used, limit: data.limit });
    }
    setBusy(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
  }

  if (plan === undefined) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={color.teal} /></View>;

  if (!plan) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={s.lock}>
          <View style={s.bigIcon}><Icon name="cpu" size={28} color={color.tealInk} /></View>
          <Text style={s.lockT}>Yapay zeka iş asistanı</Text>
          <Text style={s.lockS}>Profilini, firma vitrinini ve ilanlarını inceler; nasıl daha çok iş, eleman, makine veya alıcı bulacağını adım adım anlatır.</Text>
          {STARTERS.slice(0, 3).map(([ic, t]) => (
            <View key={t} style={s.lockRow}><Icon name={ic} size={17} color={color.tealText} /><Text style={s.lockRowT}>{t}</Text></View>
          ))}
          <Pressable style={s.cta} onPress={() => router.push(session ? '/premium' : '/hesap' as never)} accessibilityRole="button">
            <Text style={s.ctaT}>{session ? 'Premium tarifeleri gör' : 'Giriş yap'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {usage ? <PlainText style={s.usage}>{`${tr('Bu ay')}: ${usage.used} / ${usage.limit} ${tr('soru')}`}</PlainText> : null}
        {!msgs.length ? (
          <>
            <View style={s.intro}>
              <View style={s.bigIcon}><Icon name="cpu" size={26} color={color.tealInk} /></View>
              <Text style={s.introT}>Merhaba! Profilini ve ilanlarını biliyorum. Nereden başlayalım?</Text>
            </View>
            {STARTERS.map(([ic, t]) => (
              <Pressable key={t} style={({ pressed }) => [s.starter, pressed && { opacity: 0.85 }]} onPress={() => void send(tr(t))} accessibilityRole="button">
                <View style={s.starterIcon}><Icon name={ic} size={18} color={color.tealText} /></View>
                <Text style={s.starterT}>{t}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
        {msgs.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.me : s.ai]}>
            <PlainText selectable style={[s.bubbleT, m.role === 'user' && { color: color.tealInk }]}>{m.content}</PlainText>
          </View>
        ))}
        {busy ? <View style={[s.bubble, s.ai, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}><ActivityIndicator color={color.teal} /><Text style={s.bubbleT}>Düşünüyor…</Text></View> : null}
        {err ? <Text style={s.err}>{err}</Text> : null}
      </ScrollView>
      <View style={s.bar}>
        <TextInput style={s.input} value={text} onChangeText={setText} placeholder="Sorunu yaz…" multiline maxLength={1500} />
        <Pressable style={[s.send, (!text.trim() || busy) && { opacity: 0.45 }]} disabled={!text.trim() || busy} onPress={() => void send(text)} accessibilityRole="button" accessibilityLabel={tr('Gönder')}>
          <Icon name="send" size={19} color={color.tealInk} />
        </Pressable>
      </View>
      <Text style={s.disc}>Yapay zeka yanıtları öneri niteliğindedir; önemli kararları kontrol ederek ver.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  lock: { backgroundColor: color.surface, borderRadius: radius + 8, padding: 20, gap: 10, ...shadow },
  bigIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  lockT: { color: color.ink, fontFamily: font.bold, fontSize: 22, marginTop: 4 },
  lockS: { color: color.muted, fontSize: 15, lineHeight: 22 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockRowT: { flex: 1, color: color.ink, fontSize: 15 },
  cta: { marginTop: 8, backgroundColor: color.teal, borderRadius: radius, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  ctaT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  usage: { alignSelf: 'center', color: color.muted, fontSize: 13, backgroundColor: color.plate, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  intro: { alignItems: 'center', gap: 12, paddingVertical: 10 },
  introT: { color: color.ink, fontFamily: font.semi, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  starter: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: color.surface, borderRadius: radius + 2, borderWidth: 1, borderColor: color.line },
  starterIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  starterT: { flex: 1, color: color.ink, fontFamily: font.medium, fontSize: 15 },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  me: { alignSelf: 'flex-end', backgroundColor: color.teal, borderBottomRightRadius: 6 },
  ai: { alignSelf: 'flex-start', backgroundColor: color.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: color.line },
  bubbleT: { color: color.ink, fontSize: 15.5, lineHeight: 22 },
  err: { color: color.bad, textAlign: 'center' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.bg },
  input: { flex: 1, maxHeight: 120, minHeight: 46, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 16, backgroundColor: color.surface, borderRadius: 23, borderWidth: 1, borderColor: color.line },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  disc: { color: color.muted, fontSize: 11.5, textAlign: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
});
