import { useCallback, useState } from 'react';
import { listingScore, type ScoreInput } from '../lib/listingScore';
import { toast } from '../components/Toast';
import { maybeAskReview } from '../lib/review';
import { CardSkeleton } from '../components/kit';
import { GuestGate } from '../components/LoginPrompt';
import { ActionSheetIOS, Alert, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { tr } from '../lib/i18n';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { color, font, launchScheme } from '../lib/theme';

type Row = {
  id: string; title: string; price: number | string; city: string; status: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | null; listing_photos: { path: string; position: number }[] | null;
  boosted_until?: string | null; category?: string | null; usage_unit?: string | null;
};
type Stat = { views: number; phones: number; favorites: number; threads: number };
const COLS = 'id,title,price,city,status,moderation_status,boosted_until,category,description,year,usage_value,usage_unit,brand,model,video_url,video_path,tech,listing_photos(path,position)';
const isBoosted = (r: Row) => !!r.boosted_until && Date.parse(r.boosted_until) > Date.now();
const fmt = (n: number) => n.toLocaleString('tr-TR');

function statusTone(r: Row): { bg: string; fg: string } {
  if (r.status === 'sold' || r.status === 'paused') return { bg: color.plate, fg: color.muted };
  if (r.moderation_status === 'pending') return { bg: color.warnBg, fg: color.warn };
  if (r.moderation_status === 'rejected') return { bg: color.badBg, fg: color.bad };
  return { bg: color.tealSoft, fg: color.tealText };
}
type Action = { icon: IconName; label: string; danger?: boolean; run: () => void };

function statusText(r: Row) {
  if (r.status === 'sold') return 'Satıldı';
  if (r.moderation_status === 'pending') return 'İncelemede';
  if (r.moderation_status === 'rejected') return 'Reddedildi';
  if (r.status === 'paused') return 'Duraklatıldı';
  return 'Yayında';
}

export default function MyListings() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<Row | null>(null);
  const [quality, setQuality] = useState<Row | null>(null);
  const [stats, setStats] = useState<Map<string, Stat>>(new Map());
  const [auctions, setAuctions] = useState<Map<string, { current_price: number | null; bid_count: number }>>(new Map());
  const [auc, setAuc] = useState<Row | null>(null);
  const [aStart, setAStart] = useState('');
  const [aInc, setAInc] = useState('');
  const [aDays, setADays] = useState(7);
  const [aBusy, setABusy] = useState(false);
  const [aErr, setAErr] = useState('');

  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    const { data, error: e } = await supabase.from('listings').select(COLS).eq('seller_id', uid).neq('status', 'removed').order('created_at', { ascending: false });
    if (e) { setError('İlanların yüklenemedi. Bağlantını kontrol et.'); setRows([]); return; }
    setError(''); setRows((data ?? []) as unknown as Row[]);
    const au = await supabase.from('auctions').select('listing_id,current_price,bid_count').eq('seller_id', uid).eq('status', 'active');
    if (!au.error) setAuctions(new Map(((au.data ?? []) as { listing_id: string; current_price: number | null; bid_count: number }[]).map((x) => [x.listing_id, x])));
    const st = await supabase.rpc('my_listing_stats');
    if (!st.error) setStats(new Map(((st.data ?? []) as (Stat & { listing_id: string })[]).map((x) => [x.listing_id, { views: x.views, phones: x.phones, favorites: x.favorites, threads: x.threads }])));
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function patch(id: string, status: string) {
    const { error: e } = await supabase.from('listings').update({ status }).eq('id', id);
    if (!e && status === 'sold') void maybeAskReview('sold');
    if (e) Alert.alert('İlan', e.message.includes('AUCTION_HAS_BIDS') ? 'Teklif almış açık artırma sürerken ilan değiştirilemez, duraklatılamaz veya kaldırılamaz.' : e.message.includes('limit') || e.message.includes('limitine') ? 'İlan limitine ulaştın.' : 'İşlem kaydedilemedi.');
    void load();
  }
  function confirm(r: Row, status: string, text: string, yes: string, danger = false) {
    Alert.alert(r.title, tr(text), [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr(yes), style: danger ? 'destructive' : 'default', onPress: () => void patch(r.id, status) }]);
  }
  function actions(r: Row): Action[] {
    const au = auctions.get(r.id);
    if (au && au.bid_count > 0) {
      return [
        { icon: 'award', label: 'Açık artırmayı gör', run: () => router.push(`/ilan/${r.id}`) },
        { icon: 'lock', label: 'Neden değiştiremiyorum?', run: () => Alert.alert(tr('Açık artırma sürüyor'), tr('Bu ilan teklif almış bir açık artırmada. Süre bitene kadar ilan düzenlenemez, duraklatılamaz, satıldı yapılamaz veya kaldırılamaz. Süre bitince en yüksek teklifi verenle mesajlaşma otomatik açılır.')) },
      ];
    }
    const list: Action[] = [{ icon: 'edit-2', label: 'Düzenle', run: () => router.push(`/ilan-ver?duzenle=${r.id}`) }];
    if (r.status === 'active') {
      list.push({ icon: 'check-circle', label: 'Satıldı', run: () => confirm(r, 'sold', 'Bu ilan satıldı olarak işaretlensin mi? İlan yayından kalkar.', 'Evet, satıldı') });
      list.push({ icon: 'pause-circle', label: 'Duraklat', run: () => void patch(r.id, 'paused') });
    }
    if (r.status === 'active' && !isBoosted(r)) list.push({ icon: 'trending-up', label: 'Öne çıkar', run: () => Alert.alert(tr('Öne çıkar'), tr('İlanın 7 gün boyunca aramalarda üst sıralarda ve "Öne çıkan" etiketiyle görünür. Ödeme sistemi açılınca buradan satın alabileceksin. Premium üyelikte ilanların zaten öne çıkar.'), [{ text: tr('Tamam'), style: 'cancel' }, { text: tr("Premium'a bak"), onPress: () => router.push('/premium') }]) });
    if (r.status === 'active' && r.moderation_status === 'approved' && !auctions.has(r.id)) list.push({ icon: 'award', label: 'Açık artırmaya çıkar', run: () => {
      const p = Number(r.price) || 0;
      setAStart(p ? String(Math.round(p * 0.7)) : ''); setAInc(p ? String(Math.max(100, Math.round(p * 0.01 / 100) * 100)) : ''); setADays(7); setAErr(''); setAuc(r);
    } });
    if (r.category !== 'Yedek parça' && r.category !== 'Lastik ve jant') list.push({ icon: 'tool', label: 'Makine karnesi', run: () => router.push({ pathname: '/karne/[id]', params: { id: r.id, title: r.title, unit: r.usage_unit ?? '' } } as never) });
    if (r.status === 'active' && r.moderation_status === 'approved') list.push({ icon: 'grid', label: 'Satılık afişi (QR kod)', run: () => router.push({ pathname: '/afis/[id]', params: { id: r.id, title: r.title, price: tl(r.price), city: r.city } } as never) });
    if (r.status === 'paused') list.push({ icon: 'play-circle', label: 'Yayına al', run: () => void patch(r.id, 'active') });
    list.push({ icon: 'trash-2', label: 'Kaldır', danger: true, run: () => confirm(r, 'removed', 'İlan kaldırılsın mı? İşlem ve değerlendirme geçmişi korunur.', 'Kaldır', true) });
    return list;
  }

  /** İlan seçenekleri: iPhone'da sistemin kendi eylem sayfası, Android'de alttan açılan sayfa. */
  function openMenu(r: Row) {
    if (Platform.OS !== 'ios') { setMenu(r); return; }
    const list = actions(r);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: r.title,
        options: [...list.map((a) => tr(a.label)), tr('Vazgeç')],
        cancelButtonIndex: list.length,
        ...(list.some((a) => a.danger) ? { destructiveButtonIndex: list.findIndex((a) => a.danger) } : {}),
        userInterfaceStyle: launchScheme,
        // tintColor verilmez: tema rengi bu menünün kabul ettiği biçimde değil (uygulama çöküyordu); sistem rengi kullanılır
      },
      (i) => { if (i < list.length) list[i].run(); },
    );
  }

  if (!session) return <GuestGate icon="list" text="İlanlarını görmek ve yönetmek için giriş yap." />;
  if (rows === null) return <CardSkeleton />;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz ilanın yok.</Text>}
        ListHeaderComponent={rows.length && stats.size ? (() => {
          const t = [...stats.values()].reduce((a, x) => ({ views: a.views + x.views, phones: a.phones + x.phones, favorites: a.favorites + x.favorites, threads: a.threads + x.threads }), { views: 0, phones: 0, favorites: 0, threads: 0 });
          return (
            <View style={{ gap: 7, marginBottom: 6 }}>
              <Text style={s.secT} accessibilityRole="header">Tüm ilanların</Text>
              <View style={[s.card, s.sumRow]}>
                {([['eye', t.views, 'Görüntülenme'], ['heart', t.favorites, 'Favori'], ['message-circle', t.threads, 'Mesaj'], ['phone', t.phones, 'Telefon']] as [IconName, number, string][]).map(([ic, n, l], i) => (
                  <View key={l} style={[s.sumItem, i > 0 && s.statSep]} accessible accessibilityLabel={`${n} ${tr(l)}`}><Icon name={ic} size={16} color={color.tealText} /><Text style={s.sumL} numberOfLines={1}>{l}</Text><PlainText style={s.sumN}>{fmt(n)}</PlainText></View>
                ))}
              </View>
            </View>
          );
        })() : undefined}
        renderItem={({ item: r }) => {
          const photo = [...(r.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <View style={s.card}>
              <Pressable style={({ pressed }) => [s.top, pressed && { backgroundColor: color.plate }]} onPress={() => router.push(`/ilan/${r.id}`)} accessibilityRole="button">
                {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, { backgroundColor: color.plate }]} />}
                <View style={{ flex: 1, gap: 4, paddingRight: 36 }}>
                  <Text style={s.title} numberOfLines={2}>{r.title}</Text>
                  <PlainText style={s.price} numberOfLines={1}>{tl(r.price)}<PlainText style={s.city}>{`  ·  ${r.city}`}</PlainText></PlainText>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={[s.pill, { backgroundColor: statusTone(r).bg }]}><Text style={[s.pillT, { color: statusTone(r).fg }]}>{statusText(r)}</Text></View>
                    {auctions.has(r.id) ? <View style={[s.pill, { backgroundColor: color.teal }]}><Text style={[s.pillT, { color: color.tealInk }]}>{auctions.get(r.id)!.bid_count ? `${tr('Açık artırmada')} · ${auctions.get(r.id)!.bid_count} ${tr('teklif')}` : tr('Açık artırmada')}</Text></View> : null}
                    {isBoosted(r) ? <View style={[s.pill, { backgroundColor: color.teal }]}><Text style={[s.pillT, { color: color.tealInk }]}>Öne çıkan</Text></View> : null}
                  </View>
                </View>
              </Pressable>
              {stats.get(r.id) ? (
                <View style={s.stats}>
                  {([['eye', stats.get(r.id)!.views, 'görüntülenme'], ['heart', stats.get(r.id)!.favorites, 'favori'], ['message-circle', stats.get(r.id)!.threads, 'mesaj'], ['phone', stats.get(r.id)!.phones, 'telefon']] as [IconName, number, string][]).map(([ic, n, l], i) => (
                    <View key={l} style={[s.stat, i > 0 && s.statSep]} accessible accessibilityLabel={`${n} ${tr(l)}`}>
                      <View style={s.statHead}><Icon name={ic} size={13} color={color.muted} /><Text style={s.statL} numberOfLines={1}>{l}</Text></View>
                      <PlainText style={s.statN}>{fmt(n)}</PlainText>
                    </View>
                  ))}
                </View>
              ) : null}
              {r.status === 'active' ? (() => {
                // İlan kalite puanı: eksikleri tamamlayınca ilan daha çok ilgi görür
                const q = listingScore(r as ScoreInput);
                const tone = q.score >= 80 ? color.good : q.score >= 50 ? color.warn : color.bad;
                return (
                  <Pressable style={({ pressed }) => [s.quality, pressed && { opacity: 0.75 }]} onPress={() => setQuality(r)} accessibilityRole="button" accessibilityLabel={`${tr('İlan kalitesi')} ${q.score}/100`} accessibilityHint={tr('Puanın nasıl hesaplandığını gösterir')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.qLabel}>İlan kalitesi</Text>
                      <View style={s.qBar}><View style={{ width: `${q.score}%`, backgroundColor: tone, borderRadius: 3 }} /></View>
                      <PlainText style={[s.qScore, { color: tone }]}>{`${q.score}/100`}</PlainText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {q.tips.length ? <PlainText style={[s.qTips, { flex: 1 }]} numberOfLines={2}>{q.tips.map((t) => tr(t)).join(' · ')}</PlainText> : <Text style={[s.qTips, { flex: 1 }]}>Harika: ilanın eksiksiz.</Text>}
                      <Text style={s.qWhy}>Neden?</Text>
                      <View style={{ opacity: 0.55 }}><Icon name="chevron-right" size={16} color={color.muted} /></View>
                    </View>
                  </Pressable>
                );
              })() : null}
              <Pressable style={({ pressed }) => [s.more, pressed && { opacity: 0.5 }]} onPress={() => openMenu(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('İlan seçenekleri')}>
                <View style={s.moreDot}><Icon name="more-horizontal" size={18} color={color.accentText} /></View>
              </Pressable>
            </View>
          );
        }}
      />
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(null)} accessibilityLabel={tr('Kapat')}>
          <Pressable style={s.sheet} onPress={() => undefined}>
            <View style={s.grab} />
            {menu ? <PlainText style={s.sheetTitle} numberOfLines={1}>{menu.title}</PlainText> : null}
            {menu ? actions(menu).map((a, i) => (
              <Pressable key={a.label} style={({ pressed }) => [s.row, i > 0 && s.sep, pressed && { opacity: 0.7 }]} onPress={() => { setMenu(null); setTimeout(a.run, 250); }} accessibilityRole="button">
                <View style={[s.rowIcon, a.danger && { backgroundColor: color.bad }]}><Icon name={a.icon} size={17} color="#FFFFFF" /></View>
                <Text style={[s.rowT, a.danger && { color: color.bad }]}>{a.label}</Text>
              </Pressable>
            )) : null}
            <Pressable style={s.cancel} onPress={() => setMenu(null)} accessibilityRole="button"><Text style={s.cancelT}>Vazgeç</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {/* İlan kalitesi: puanın maddeleri ve eksikler */}
      <Modal visible={!!quality} transparent animationType="slide" onRequestClose={() => setQuality(null)}>
        <Pressable style={s.backdrop} onPress={() => setQuality(null)} accessibilityLabel={tr('Kapat')}>
          <Pressable style={[s.sheet, { maxHeight: '86%' }]} onPress={() => undefined}>
            <View style={s.grab} />
            {quality ? (() => {
              const q = listingScore(quality as ScoreInput);
              const tone = q.score >= 80 ? color.good : q.score >= 50 ? color.warn : color.bad;
              return (
                <ScrollView contentContainerStyle={{ gap: 12 }}>
                  <Text style={s.qhTitle}>İlan kalitesi</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <PlainText style={[s.qhScore, { color: tone }]}>{String(q.score)}</PlainText>
                    <PlainText style={s.qhOf}>/ 100</PlainText>
                  </View>
                  <Text style={s.qhLead}>Puan, alıcıların bir ilanda en çok baktığı bilgilere göre hesaplanır. Eksikleri tamamladıkça ilanın aramalarda daha çok ilgi görür. Bu puanı yalnızca sen görürsün.</Text>
                  <View style={s.qhList}>
                    {q.items.map((x, i) => (
                      <View key={x.label} style={[s.qhRow, i > 0 && s.sep]}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon name={x.got >= x.max ? 'check-circle' : 'alert-circle'} size={16} color={x.got >= x.max ? color.good : color.warn} />
                            <Text style={s.qhLabel}>{x.label}</Text>
                          </View>
                          <PlainText style={s.qhDetail}>{`${tr('Şu an')}: ${x.detail}`}{x.tip ? `  ·  ${tr(x.tip)}` : ''}</PlainText>
                        </View>
                        <PlainText style={s.qhPts}>{`${x.got} / ${x.max}`}</PlainText>
                      </View>
                    ))}
                  </View>
                  <Pressable style={({ pressed }) => [s.qhBtn, pressed && { opacity: 0.85 }]} onPress={() => { const id = quality.id; setQuality(null); setTimeout(() => router.push(`/ilan-ver?duzenle=${id}`), 250); }} accessibilityRole="button">
                    <Icon name="edit-2" size={17} color={color.tealInk} /><Text style={s.qhBtnT}>Eksikleri tamamla</Text>
                  </Pressable>
                  <Pressable style={s.cancel} onPress={() => setQuality(null)} accessibilityRole="button"><Text style={s.cancelT}>Kapat</Text></Pressable>
                </ScrollView>
              );
            })() : null}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={!!auc} transparent animationType="slide" onRequestClose={() => setAuc(null)}>
        <Pressable style={s.backdrop} onPress={() => setAuc(null)} accessibilityLabel={tr('Kapat')}>
          <Pressable style={[s.sheet, { gap: 10 }]} onPress={() => undefined}>
            <View style={[s.grab, { marginBottom: 2 }]} />
            <Text style={s.aTitle}>Açık artırmaya çıkar</Text>
            {auc ? <PlainText style={s.sheetTitle} numberOfLines={1}>{auc.title}</PlainText> : null}
            <Text style={s.aK}>Başlangıç fiyatı (₺)</Text>
            <TextInput style={s.aIn} value={aStart} onChangeText={setAStart} keyboardType="number-pad" />
            <Text style={s.aK}>En az artış (₺)</Text>
            <TextInput style={s.aIn} value={aInc} onChangeText={setAInc} keyboardType="number-pad" />
            <Text style={s.aK}>Süre</Text>
            <View style={s.aSeg}>
              {[1, 3, 5, 7, 10].map((d) => (
                <Pressable hitSlop={6} key={d} style={[s.aSegI, aDays === d && s.aSegOn]} onPress={() => setADays(d)} accessibilityRole="radio" accessibilityState={{ selected: aDays === d }}>
                  <PlainText style={[s.aSegT, aDays === d && { fontFamily: font.semi }]}>{`${d} ${tr('gün')}`}</PlainText>
                </Pressable>
              ))}
            </View>
            <Text style={s.aNote}>Teklif geldikten sonra açık artırma iptal edilemez; ilan da süre bitene kadar düzenlenemez, duraklatılamaz veya kaldırılamaz. Süre bitince en yüksek teklifi verenle mesajlaşma otomatik açılır.</Text>
            {aErr ? <Text style={{ color: color.bad }}>{aErr}</Text> : null}
            <Pressable style={[s.aBtn, aBusy && { opacity: 0.6 }]} disabled={aBusy} onPress={async () => {
              if (!auc) return;
              const st = Number(aStart.replace(/\./g, '')); const inc = Number(aInc.replace(/\./g, ''));
              if (!st || st <= 0) { setAErr(tr('Başlangıç fiyatını gir.')); return; }
              if (!inc || inc <= 0 || inc > st) { setAErr(tr('Artış tutarı 0\'dan büyük ve başlangıç fiyatından küçük olmalı.')); return; }
              setABusy(true); setAErr('');
              const { error: e } = await supabase.rpc('create_auction', { p_listing: auc.id, p_start: st, p_increment: inc, p_days: aDays });
              setABusy(false);
              if (e) { setAErr(tr(e.message.includes('LISTING_NOT_LIVE') ? 'İlan onaylanıp yayına girince açık artırma başlatabilirsin.' : e.message.includes('AUCTION_EXISTS') ? 'Bu ilan zaten açık artırmada.' : e.message.includes('AUCTION_LIMIT') ? 'Aynı anda en fazla 10 açık artırma olabilir.' : 'Açık artırma başlatılamadı.')); return; }
              setAuc(null); void load();
              toast('Açık artırma başladı. Gelen teklifleri bildirimlerden takip edebilirsin.');
            }} accessibilityRole="button"><Text style={s.aBtnT}>Başlat</Text></Pressable>
            <Pressable style={s.cancel} onPress={() => setAuc(null)} accessibilityRole="button"><Text style={s.cancelT}>Vazgeç</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/*
 * Görünüm: iPhone'un gruplu liste düzeni (bkz. components/Rows.tsx). Gölgesiz ve çerçevesiz kartlar,
 * ince ara çizgiler, basınca gri satır, sistem ölçüleri (en az 44 pt dokunma alanı).
 */
const HAIR = StyleSheet.hairlineWidth;
const s = StyleSheet.create({
  secT: { fontSize: 13, color: color.muted, marginLeft: 16 },
  aTitle: { color: color.ink, fontFamily: font.semi, fontSize: 19, textAlign: 'center' },
  aK: { color: color.muted, fontSize: 13, marginLeft: 4 },
  aIn: { minHeight: 48, paddingHorizontal: 14, fontSize: 17, color: color.ink, backgroundColor: color.bg, borderRadius: 12 },
  // iPhone'un bölümlü seçicisi: gri zemin, seçili parça beyaz ve hafif gölgeli
  aSeg: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: color.plate },
  aSegI: { flex: 1, minHeight: 38, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  aSegOn: { backgroundColor: color.surface, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  aSegT: { color: color.ink, fontFamily: font.medium, fontSize: 13.5 },
  aNote: { color: color.muted, fontSize: 13, lineHeight: 18, marginHorizontal: 4 },
  aBtn: { minHeight: 50, borderRadius: 14, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  aBtnT: { color: color.tealInk, fontFamily: font.semi, fontSize: 17 },
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  err: { color: color.bad, margin: 12 },
  card: { backgroundColor: color.surface, borderRadius: 16, overflow: 'hidden' },
  top: { flexDirection: 'row', gap: 12, padding: 12 },
  img: { width: 92, height: 70, borderRadius: 10 },
  title: { fontFamily: font.semi, color: color.ink, fontSize: 16, lineHeight: 21 },
  price: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
  city: { color: color.muted, fontFamily: font.regular, fontSize: 14 },
  pill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pillT: { fontFamily: font.semi, fontSize: 12 },
  qWhy: { color: color.accentText, fontSize: 13 },
  qhTitle: { fontFamily: font.semi, fontSize: 19, color: color.ink, textAlign: 'center' },
  qhScore: { fontFamily: font.bold, fontSize: 44, lineHeight: 48 },
  qhOf: { fontFamily: font.semi, fontSize: 18, color: color.muted },
  qhLead: { fontSize: 14, lineHeight: 20, color: color.muted },
  qhList: { borderRadius: 14, paddingHorizontal: 14, backgroundColor: color.bg },
  qhRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  qhLabel: { fontSize: 16, color: color.ink },
  qhDetail: { fontSize: 13, lineHeight: 17, color: color.muted, marginLeft: 24 },
  qhPts: { fontFamily: font.semi, fontSize: 15, color: color.muted },
  qhBtn: { height: 50, borderRadius: 14, backgroundColor: color.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  qhBtnT: { fontFamily: font.semi, fontSize: 17, color: color.tealInk },
  quality: { borderTopWidth: HAIR, borderTopColor: color.line, marginLeft: 12, paddingVertical: 10, paddingRight: 12, gap: 5 },
  qLabel: { fontSize: 13, color: color.muted },
  qBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.plate, flexDirection: 'row', overflow: 'hidden' },
  qScore: { fontFamily: font.semi, fontSize: 14 },
  qTips: { fontSize: 13, lineHeight: 17, color: color.muted },
  stats: { flexDirection: 'row', borderTopWidth: HAIR, borderTopColor: color.line, marginLeft: 12, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2 },
  statSep: { borderLeftWidth: HAIR, borderLeftColor: color.line },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statL: { color: color.muted, fontSize: 12, textAlign: 'center' },
  statN: { color: color.ink, fontFamily: font.semi, fontSize: 17, textAlign: 'center' },
  sumRow: { flexDirection: 'row', paddingVertical: 12 },
  sumItem: { flex: 1, alignItems: 'center', gap: 3 },
  sumN: { color: color.ink, fontFamily: font.semi, fontSize: 19 },
  sumL: { color: color.muted, fontSize: 12 },
  more: { position: 'absolute', top: 4, right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  moreDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34 },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: color.line, marginBottom: 10 },
  sheetTitle: { color: color.muted, fontSize: 13, textAlign: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  sep: { borderTopWidth: HAIR, borderTopColor: color.line },
  rowIcon: { width: 30, height: 30, borderRadius: 7, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  rowT: { color: color.ink, fontSize: 16.5 },
  cancel: { marginTop: 10, minHeight: 50, borderRadius: 14, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' },
  cancelT: { color: color.ink, fontFamily: font.semi, fontSize: 17 },
});
