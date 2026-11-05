import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { useApp } from '../lib/AppContext';
import { useLang } from '../lib/lang';
import { tr } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { FREE, PLANS, activePlan, money, yearlyTotal, type Period, type Plan, type PlanId } from '../lib/plans';
import { color, font, radius, shadow } from '../lib/theme';

type Prof = { is_premium?: boolean | null; premium_plan?: string | null; premium_until?: string | null };

export default function Premium() {
  const { session } = useApp();
  const { lang } = useLang();
  const [prof, setProf] = useState<Prof | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  useEffect(() => {
    if (!session) { setProf(null); return; }
    void supabase.from('profiles').select('is_premium,premium_plan,premium_until').eq('id', session.user.id).maybeSingle()
      .then((r) => setProf((r.data as Prof | null) ?? null));
  }, [session]);
  const current = activePlan(prof);
  const until = prof?.premium_until ? new Date(prof.premium_until).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'tr-TR') : '';

  const buy = (p: Plan) => {
    if (!session) { router.navigate('/hesap'); return; }
    Alert.alert(tr('Çok yakında'), `${tr(p.name)} · ${period === 'yearly' ? money(yearlyTotal(p), lang) + ' / ' + tr('yıl') : money(p.monthly, lang) + ' / ' + tr('ay')}\n\n${tr('Premium satın alma, ödeme altyapısı ve sözleşmeler onaylandığında açılacak. Şu anda kart bilgisi alınmıyor.')}`);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.hero}>
        <View style={s.heroIcon}><Icon name="award" size={26} color={color.tealInk} /></View>
        <Text style={s.h1}>Makinasal Premium</Text>
        <Text style={s.lead}>İlanların ve firman üstte görünsün, yapay zeka asistanı profilini ve ilanlarını güçlendirsin.</Text>
      </View>

      {current ? (
        <View style={s.status}>
          <Icon name="check-circle" size={22} color={color.tealText} />
          <View style={{ flex: 1 }}>
            <PlainText style={s.statusT}>{`${tr(PLANS.find((x) => x.id === current)!.name)} ${tr('üyesisin')}`}</PlainText>
            {until ? <PlainText style={s.statusS}>{`${tr('Bitiş tarihi')}: ${until}`}</PlainText> : null}
          </View>
          <Pressable style={s.statusBtn} onPress={() => router.push('/asistan' as never)} accessibilityRole="button"><Text style={s.statusBtnT}>Asistanı aç</Text></Pressable>
        </View>
      ) : null}

      <View style={s.toggle} accessibilityRole="tablist">
        {(['monthly', 'yearly'] as Period[]).map((p) => (
          <Pressable key={p} style={[s.toggleBtn, period === p && s.toggleOn]} onPress={() => setPeriod(p)} accessibilityRole="tab" accessibilityState={{ selected: period === p }}>
            <Text style={[s.toggleT, period === p && { color: color.tealInk }]}>{p === 'monthly' ? 'Aylık' : 'Yıllık'}</Text>
            {p === 'yearly' ? <View style={[s.save, period === p && { backgroundColor: 'rgba(255,255,255,0.22)' }]}><Text style={[s.saveT, period === p && { color: color.tealInk }]}>2 ay bedava</Text></View> : null}
          </Pressable>
        ))}
      </View>

      <Text style={s.yearNote}>Yıllık üyelikte 2 ay bedava: 10 aylık ücret öde, 12 ay kullan.</Text>

      {PLANS.map((p) => <PlanCard key={p.id} p={p} period={period} lang={lang} current={current} onBuy={() => buy(p)} />)}

      <View style={s.free}>
        <Text style={s.freeT}>Ücretsiz üyelik</Text>
        {[`${FREE.listings} ${tr('ilan hakkı')}, ${tr('ilan başına')} ${FREE.photos} ${tr('fotoğraf')}`, tr('Mesajlaşma, favoriler ve kayıtlı aramalar'), tr('İş ağında talep ve teklif')].map((t) => (
          <View key={t} style={s.feat}><Icon name="check" size={16} color={color.muted} /><PlainText style={s.freeF}>{t}</PlainText></View>
        ))}
      </View>
      <Text style={s.note}>Fiyatlar Türk lirasıdır. Güven puanı ve doğrulama rozetleri satın alınamaz; premium yalnızca görünürlük ve araçlar sağlar.</Text>
    </ScrollView>
  );
}

function PlanCard({ p, period, lang, current, onBuy }: { p: Plan; period: Period; lang: 'tr' | 'en' | 'de'; current: PlanId | null; onBuy: () => void }) {
  const mine = current === p.id;
  const big = p.id === 'business';
  return (
    <View style={[s.card, big && s.cardBig]}>
      <View style={s.cardHead}>
        <Text style={s.planName}>{p.name}</Text>
        {big ? <View style={s.tag}><Text style={s.tagT}>Şirketler için</Text></View> : null}
      </View>
      <Text style={s.tagline}>{p.tagline}</Text>
      <View style={s.priceRow}>
        <PlainText style={s.price}>{money(period === 'yearly' ? yearlyTotal(p) : p.monthly, lang)}</PlainText>
        <PlainText style={s.per}>{` / ${tr(period === 'yearly' ? 'yıl' : 'ay')}`}</PlainText>
      </View>
      {period === 'yearly'
        ? <PlainText style={s.perMonth}>{`${tr('12 ay kullan, 10 ay öde')} · ${tr('2 ay bedava')} (${money(p.monthly * 2, lang)})`}</PlainText>
        : <PlainText style={s.perMonth}>{`${tr('Yıllık üyelikte 2 ay bedava')}: ${money(yearlyTotal(p), lang)} / ${tr('yıl')}`}</PlainText>}
      <View style={{ gap: 9, marginTop: 14 }}>
        {p.features.map((f) => (
          <View key={f} style={s.feat}>
            <View style={s.check}><Icon name="check" size={14} color={color.tealText} /></View>
            <Text style={s.featT}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable style={({ pressed }) => [s.buy, mine && s.buyMine, pressed && !mine && { opacity: 0.88 }]} disabled={mine} onPress={onBuy} accessibilityRole="button">
        <Text style={[s.buyT, mine && { color: color.tealText }]}>{mine ? 'Mevcut tarifen' : 'Bu tarifeyi seç'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  hero: { backgroundColor: color.navy, padding: 20, paddingTop: 22, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  h1: { color: color.onBar, fontFamily: font.bold, fontSize: 28, lineHeight: 34 },
  lead: { color: color.onNavy, fontSize: 15.5, lineHeight: 22 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, marginBottom: 0, padding: 14, backgroundColor: color.tealSoft, borderRadius: radius + 4 },
  statusT: { color: color.ink, fontFamily: font.bold, fontSize: 16 },
  statusS: { color: color.muted, fontSize: 13.5 },
  statusBtn: { backgroundColor: color.teal, borderRadius: 20, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  statusBtnT: { color: color.tealInk, fontFamily: font.semi },
  toggle: { flexDirection: 'row', margin: 16, marginBottom: 6, padding: 4, backgroundColor: color.plate, borderRadius: 26 },
  toggleBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22 },
  toggleOn: { backgroundColor: color.teal },
  toggleT: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
  save: { backgroundColor: color.tealSoft, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  saveT: { color: color.tealText, fontFamily: font.bold, fontSize: 11.5 },
  yearNote: { color: color.tealText, fontFamily: font.semi, fontSize: 14, textAlign: 'center', marginHorizontal: 16, marginTop: 2 },
  card: { marginHorizontal: 16, marginTop: 12, padding: 18, backgroundColor: color.surface, borderRadius: radius + 8, borderWidth: 1, borderColor: color.line, ...shadow },
  cardBig: { borderWidth: 2, borderColor: color.teal },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  planName: { color: color.ink, fontFamily: font.bold, fontSize: 22 },
  tag: { backgroundColor: color.teal, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagT: { color: color.tealInk, fontFamily: font.semi, fontSize: 12 },
  tagline: { color: color.muted, fontSize: 14.5, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  price: { color: color.ink, fontFamily: font.bold, fontSize: 32, lineHeight: 36 },
  per: { color: color.muted, fontSize: 16, marginBottom: 4 },
  perMonth: { color: color.tealText, fontFamily: font.semi, fontSize: 13.5, marginTop: 4 },
  feat: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  featT: { flex: 1, color: color.ink, fontSize: 15, lineHeight: 21 },
  buy: { marginTop: 18, backgroundColor: color.teal, borderRadius: radius, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  buyMine: { backgroundColor: color.tealSoft },
  buyT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  free: { marginHorizontal: 16, marginTop: 16, padding: 16, gap: 8, borderRadius: radius + 4, borderWidth: 1, borderColor: color.line },
  freeT: { color: color.ink, fontFamily: font.bold, fontSize: 17, marginBottom: 2 },
  freeF: { flex: 1, color: color.muted, fontSize: 14.5 },
  note: { color: color.muted, fontSize: 13, lineHeight: 19, marginHorizontal: 20, marginTop: 14 },
});
