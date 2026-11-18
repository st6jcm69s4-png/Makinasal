import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { useApp } from '../lib/AppContext';
import { useLang } from '../lib/lang';
import { tr } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { FREE, LISTING_CREDIT_PRICE, PLANS, activePlan, money, yearlyTotal, type Period, type Plan, type PlanId } from '../lib/plans';
import { openTab } from '../lib/tabBack';
import { available as storeAvailable, buy as storeBuy, loadProducts, manage, redeemCode, restore, type StoreProducts } from '../lib/purchases';
import { success as hapticSuccess } from '../lib/haptics';
import { toast } from '../components/Toast';
import { fetchQuota, purchaseListingCredit, quotaLine, type Quota } from '../lib/quota';
import { color, font, radius, shadow } from '../lib/theme';

type Prof = { is_premium?: boolean | null; premium_plan?: string | null; premium_until?: string | null };

export default function Premium() {
  const { session } = useApp();
  const { lang } = useLang();
  const [prof, setProf] = useState<Prof | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [products, setProducts] = useState<StoreProducts>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  useEffect(() => { if (session) void fetchQuota().then(setQuota); else setQuota(null); }, [session, prof]);
  const native = Platform.OS !== 'web';

  const readProfile = useCallback(async () => {
    if (!session) { setProf(null); return null; }
    const r = await supabase.rpc('profile_plans', { p_ids: [session.user.id] });
    const x = ((r.data ?? []) as { plan: string | null; until: string | null }[])[0];
    const row: Prof | null = x ? { is_premium: !!x.plan, premium_plan: x.plan, premium_until: x.until } : null;
    setProf(row);
    return row;
  }, [session]);
  useEffect(() => { void readProfile(); }, [readProfile]);
  useEffect(() => { void loadProducts().then(setProducts).catch(() => undefined); }, []);

  const current = activePlan(prof);
  const until = prof?.premium_until ? new Date(prof.premium_until).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'tr-TR') : '';

  // Mağaza ödemeyi onaylayınca sunucu (webhook) üyeliği birkaç saniye içinde açar; profil o zamana kadar yeniden okunur.
  const waitForPremium = async () => {
    for (let i = 0; i < 12; i++) {
      const row = await readProfile();
      if (row && activePlan(row)) return true;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  };

  const notReady = () => Alert.alert(tr('Satın alma bu sürümde kapalı'), tr('Premium, App Store veya Google Play’den indirilen Makinasal uygulamasından satın alınır. Ödemeyi Apple ya da Google alır; kart bilgin bize gelmez.'));

  const buy = async (p: Plan) => {
    if (!session) { openTab('/hesap'); return; }
    if (!native || !storeAvailable()) { notReady(); return; }
    const prod = products[`${p.id}.${period}`];
    if (!prod) { Alert.alert(tr('Tarife şu anda alınamıyor'), tr('Mağaza bu tarifeyi henüz göstermiyor. Biraz sonra yeniden dene.')); return; }
    setBusy(p.id);
    const r = await storeBuy(prod);
    if (r === 'ok') {
      const on = await waitForPremium();
      hapticSuccess();
      toast(on ? tr('Premium üyeliğin açıldı') : tr('Ödeme alındı, üyeliğin birkaç dakika içinde açılacak'));
    } else if (r === 'pending') {
      Alert.alert(tr('Ödeme onay bekliyor'), tr('Mağaza ödemeyi onaylayınca üyeliğin kendiliğinden açılacak.'));
    } else if (r === 'error') {
      Alert.alert(tr('Ödeme tamamlanamadı'), tr('Kartından para çekilmedi. Bağlantını kontrol edip yeniden dene.'));
    }
    setBusy(null);
  };

  const onRestore = async () => {
    if (!session) { openTab('/hesap'); return; }
    if (!storeAvailable()) { notReady(); return; }
    setBusy('restore');
    const r = await restore();
    if (r === 'ok') { await waitForPremium(); toast(tr('Satın alımların geri yüklendi')); }
    else if (r === 'none') Alert.alert(tr('Satın alım bulunamadı'), tr('Bu Apple / Google hesabıyla alınmış etkin bir Premium üyelik yok.'));
    else Alert.alert(tr('Geri yüklenemedi'), tr('Bağlantını kontrol edip yeniden dene.'));
    setBusy(null);
  };

  const onRedeem = async () => {
    if (!session) { openTab('/hesap'); return; }
    if (!storeAvailable()) { notReady(); return; }
    await redeemCode().catch(() => undefined);
    // Kod kullanıldıysa mağaza bildirir, sunucu üyeliği açar
    setTimeout(() => { void readProfile(); }, 4000);
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

      {PLANS.map((p) => (
        <PlanCard key={p.id} p={p} period={period} lang={lang} current={current} busy={busy === p.id} disabled={!!busy}
          store={products[`${p.id}.${period}`]} onBuy={() => { void buy(p); }} />
      ))}

      {native ? (
        <View style={s.links}>
          <Pressable style={s.linkBtn} onPress={() => { void onRedeem(); }} disabled={!!busy} accessibilityRole="button">
            <Icon name="tag" size={17} color={color.tealText} /><Text style={s.linkT}>İndirim kodu kullan</Text>
          </Pressable>
          <Pressable style={s.linkBtn} onPress={() => { void onRestore(); }} disabled={!!busy} accessibilityRole="button">
            {busy === 'restore' ? <ActivityIndicator color={color.tealText} /> : <Icon name="refresh-cw" size={17} color={color.tealText} />}
            <Text style={s.linkT}>Satın alımları geri yükle</Text>
          </Pressable>
          {current ? (
            <Pressable style={s.linkBtn} onPress={() => { void manage(); }} accessibilityRole="button">
              <Icon name="settings" size={17} color={color.tealText} /><Text style={s.linkT}>Üyeliği yönet veya iptal et</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={s.free}>
        <Text style={s.freeT}>Ücretsiz üyelik</Text>
        {[`${tr('Ayda')} ${FREE.listings} ${tr('yeni ilan')}, ${tr('ilan başına')} ${FREE.photos} ${tr('fotoğraf')}`, tr('Mesajlaşma, favoriler ve 20 kayıtlı arama'), tr('İş ağında talep ve teklif')].map((t) => (
          <View key={t} style={s.feat}><Icon name="check" size={16} color={color.muted} /><PlainText style={s.freeF}>{t}</PlainText></View>
        ))}
      </View>
      {/* Ek ilan hakkı: üyelik almadan tek ilan */}
      <View style={s.free}>
        <Text style={s.freeT}>Ek ilan hakkı</Text>
        <PlainText style={s.freeF}>{`${tr('İlan hakkın bitince tek bir ilan için ek ilan hakkı alabilirsin')}: ${money(LISTING_CREDIT_PRICE, lang)}. ${tr('Ek haklar süresizdir, dönem hakkın bitince kullanılır.')}`}</PlainText>
        {quota ? <PlainText style={[s.freeF, { color: color.ink, fontFamily: font.semi }]}>{quotaLine(quota, lang)}</PlainText> : null}
        {native ? (
          <Pressable style={({ pressed }) => [s.creditBtn, pressed && { opacity: 0.85 }]} disabled={!!busy} accessibilityRole="button"
            onPress={() => {
              if (!session) { openTab('/hesap'); return; }
              if (!storeAvailable()) { notReady(); return; }
              setBusy('credit');
              void purchaseListingCredit().then((ok) => { if (ok) toast(tr('Ek ilan hakkın eklendi')); return fetchQuota(); }).then((q) => { if (q) setQuota(q); }).finally(() => setBusy(null));
            }}>
            {busy === 'credit' ? <ActivityIndicator color={color.tealText} /> : <Text style={s.linkT}>Ek ilan hakkı al</Text>}
          </Pressable>
        ) : null}
      </View>
      <Text style={s.note}>Fiyatlar Türk lirasıdır. Güven puanı ve doğrulama rozetleri satın alınamaz; Pro rozeti yalnızca üyelik türünü gösterir. Premium görünürlük ve araçlar sağlar.</Text>
      {native ? (
        <Text style={s.note}>{Platform.OS === 'ios'
          ? 'Ödeme, satın almayı onayladığında Apple Kimliği hesabından alınır. Üyelik, dönem bitmeden en az 24 saat önce iptal edilmezse aynı süre ve ücretle kendiliğinden yenilenir; yenileme ücreti dönem bitiminden önceki 24 saat içinde alınır. Üyeliği App Store hesap ayarlarından yönetebilir ve iptal edebilirsin.'
          : 'Ödeme, satın almayı onayladığında Google Play hesabından alınır. Üyelik, dönem bitmeden iptal edilmezse aynı süre ve ücretle kendiliğinden yenilenir. Üyeliği Google Play abonelikler bölümünden yönetebilir ve iptal edebilirsin.'}</Text>
      ) : null}
      <View style={s.legal}>
        <Pressable onPress={() => router.push('/hukuki/premium-sozlesme' as never)} accessibilityRole="link" hitSlop={8}><Text style={s.legalT}>Premium üyelik sözleşmesi</Text></Pressable>
        <PlainText style={s.legalDot}>·</PlainText>
        <Pressable onPress={() => router.push('/hukuki/kvkk' as never)} accessibilityRole="link" hitSlop={8}><Text style={s.legalT}>Gizlilik ve KVKK</Text></Pressable>
        <PlainText style={s.legalDot}>·</PlainText>
        <Pressable onPress={() => router.push('/hukuki/kullanim' as never)} accessibilityRole="link" hitSlop={8}><Text style={s.legalT}>Kullanım koşulları</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function PlanCard({ p, period, lang, current, onBuy, store, busy, disabled }: {
  p: Plan; period: Period; lang: 'tr' | 'en' | 'de'; current: PlanId | null; onBuy: () => void;
  store?: StoreProducts[keyof StoreProducts]; busy: boolean; disabled: boolean;
}) {
  const mine = current === p.id;
  const big = p.id === 'business';
  // Mağazanın gösterdiği fiyat (ülkeye ve vergiye göre) varsa o yazılır; yoksa tarife fiyatı
  const headPrice = period === 'yearly' ? (store?.price ?? money(yearlyTotal(p), lang)) : (store ? (store.intro ?? store.price) : money(p.intro, lang));
  const headPer = period === 'yearly' ? 'yıl' : store && !store.intro ? 'ay' : 'ilk ay';
  const thenPrice = store ? store.price : money(p.monthly, lang);
  return (
    <View style={[s.card, big && s.cardBig]}>
      <View style={s.cardHead}>
        <Text style={s.planName}>{p.name}</Text>
        {big ? <View style={s.tag}><Text style={s.tagT}>Şirketler için</Text></View> : null}
      </View>
      <Text style={s.tagline}>{p.tagline}</Text>
      <View style={s.priceRow}>
        <PlainText style={s.price}>{headPrice}</PlainText>
        <PlainText style={s.per}>{` / ${tr(headPer)}`}</PlainText>
      </View>
      {period === 'monthly' && headPer === 'ilk ay' ? <PlainText style={s.then}>{`${tr('Sonraki aylar')} ${thenPrice} / ${tr('ay')}`}</PlainText> : null}
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
      <Pressable style={({ pressed }) => [s.buy, mine && s.buyMine, pressed && !mine && { opacity: 0.88 }, disabled && !busy && !mine && { opacity: 0.6 }]} disabled={mine || disabled} onPress={onBuy} accessibilityRole="button" accessibilityState={{ busy, disabled: mine || disabled }}>
        {busy ? <ActivityIndicator color={color.tealInk} /> : <Text style={[s.buyT, mine && { color: color.tealText }]}>{mine ? 'Mevcut tarifen' : 'Bu tarifeyi seç'}</Text>}
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
  then: { color: color.ink, fontFamily: font.semi, fontSize: 14.5, marginTop: 3 },
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
  links: { marginHorizontal: 16, marginTop: 16, borderRadius: radius + 4, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, overflow: 'hidden' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  linkT: { color: color.tealText, fontFamily: font.semi, fontSize: 15.5 },
  creditBtn: { marginTop: 6, minHeight: 44, borderRadius: radius, borderWidth: 1, borderColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 14 },
  legalT: { color: color.tealText, fontFamily: font.semi, fontSize: 13 },
  legalDot: { color: color.muted, fontSize: 13 },
});
