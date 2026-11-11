import { useCallback, useState } from 'react';
import { listingScore, type ScoreInput } from '../lib/listingScore';
import { toast } from '../components/Toast';
import { CardSkeleton } from '../components/kit';
import { GuestGate } from '../components/LoginPrompt';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { tr } from '../lib/i18n';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { color, font, radius, shadow } from '../lib/theme';

type Row = {
  id: string; title: string; price: number | string; city: string; status: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | null; listing_photos: { path: string; position: number }[] | null;
  boosted_until?: string | null;
};
type Stat = { views: number; phones: number; favorites: number; threads: number };
const COLS = 'id,title,price,city,status,moderation_status,boosted_until,category,description,year,usage_value,brand,model,video_url,video_path,tech,listing_photos(path,position)';
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
    if (r.status === 'paused') list.push({ icon: 'play-circle', label: 'Yayına al', run: () => void patch(r.id, 'active') });
    list.push({ icon: 'trash-2', label: 'Kaldır', danger: true, run: () => confirm(r, 'removed', 'İlan kaldırılsın mı? İşlem ve değerlendirme geçmişi korunur.', 'Kaldır', true) });
    return list;
  }

  if (!session) return <GuestGate icon="list" text="İlanlarını görmek ve yönetmek için giriş yap." />;
  if (rows === null) return <CardSkeleton />;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz ilanın yok.</Text>}
        ListHeaderComponent={rows.length && stats.size ? (() => {
          const t = [...stats.values()].reduce((a, x) => ({ views: a.views + x.views, phones: a.phones + x.phones, favorites: a.favorites + x.favorites, threads: a.threads + x.threads }), { views: 0, phones: 0, favorites: 0, threads: 0 });
          return (
            <View style={s.sum}>
              <Text style={s.sumT}>Tüm ilanların</Text>
              <View style={s.sumRow}>
                {([['eye', t.views, 'Görüntülenme'], ['heart', t.favorites, 'Favori'], ['message-circle', t.threads, 'Mesaj'], ['phone', t.phones, 'Telefon']] as [IconName, number, string][]).map(([ic, n, l]) => (
                  <View key={l} style={s.sumItem}><Icon name={ic} size={16} color={color.tealText} /><PlainText style={s.sumN}>{fmt(n)}</PlainText><Text style={s.sumL}>{l}</Text></View>
                ))}
              </View>
            </View>
          );
        })() : undefined}
        renderItem={({ item: r }) => {
          const photo = [...(r.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <View style={s.card}>
              <Pressable style={s.top} onPress={() => router.push(`/ilan/${r.id}`)} accessibilityRole="button">
                {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, { backgroundColor: color.plate }]} />}
                <View style={{ flex: 1, gap: 4, paddingRight: 34 }}>
                  <Text style={s.title} numberOfLines={2}>{r.title}</Text>
                  <PlainText style={s.price}>{`${tl(r.price)} · ${r.city}`}</PlainText>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={[s.pill, { backgroundColor: statusTone(r).bg }]}><Text style={[s.pillT, { color: statusTone(r).fg }]}>{statusText(r)}</Text></View>
                    {auctions.has(r.id) ? <View style={[s.pill, { backgroundColor: color.teal }]}><Text style={[s.pillT, { color: color.tealInk }]}>{auctions.get(r.id)!.bid_count ? `${tr('Açık artırmada')} · ${auctions.get(r.id)!.bid_count} ${tr('teklif')}` : tr('Açık artırmada')}</Text></View> : null}
                    {isBoosted(r) ? <View style={[s.pill, { backgroundColor: color.teal }]}><Text style={[s.pillT, { color: color.tealInk }]}>Öne çıkan</Text></View> : null}
                  </View>
                </View>
              </Pressable>
              {stats.get(r.id) ? (
                <View style={s.stats}>
                  {([['eye', stats.get(r.id)!.views, 'görüntülenme'], ['heart', stats.get(r.id)!.favorites, 'favori'], ['message-circle', stats.get(r.id)!.threads, 'mesaj'], ['phone', stats.get(r.id)!.phones, 'telefon']] as [IconName, number, string][]).map(([ic, n, l]) => (
                    <View key={l} style={s.stat} accessibilityLabel={`${n} ${tr(l)}`}><Icon name={ic} size={14} color={color.muted} /><PlainText style={s.statN}>{fmt(n)}</PlainText></View>
                  ))}
                </View>
              ) : null}
              {r.status === 'active' ? (() => {
                // İlan kalite puanı: eksikleri tamamlayınca ilan daha çok ilgi görür
                const q = listingScore(r as ScoreInput);
                const tone = q.score >= 80 ? color.good : q.score >= 50 ? color.warn : color.bad;
                return (
                  <Pressable style={s.quality} onPress={() => router.push({ pathname: '/ilan-ver', params: { duzenle: r.id } } as never)} accessibilityRole="button" accessibilityLabel={`${tr('İlan kalitesi')} ${q.score}/100`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.qLabel}>İlan kalitesi</Text>
                      <View style={s.qBar}><View style={{ width: `${q.score}%`, backgroundColor: tone, borderRadius: 3 }} /></View>
                      <PlainText style={[s.qScore, { color: tone }]}>{`${q.score}/100`}</PlainText>
                    </View>
                    {q.tips.length ? <PlainText style={s.qTips} numberOfLines={2}>{q.tips.map((t) => tr(t)).join(' · ')}</PlainText> : <Text style={s.qTips}>Harika: ilanın eksiksiz.</Text>}
                  </Pressable>
                );
              })() : null}
              <Pressable style={s.more} onPress={() => setMenu(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('İlan seçenekleri')}>
                <Icon name="more-vertical" size={20} color={color.ink} />
              </Pressable>
            </View>
          );
        }}
      />
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(null)} accessibilityLabel={tr('Kapat')}>
          <Pressable style={s.sheet} onPress={() => undefined}>
            {menu ? <PlainText style={s.sheetTitle} numberOfLines={1}>{menu.title}</PlainText> : null}
            {menu ? actions(menu).map((a, i) => (
              <Pressable key={a.label} style={({ pressed }) => [s.row, i > 0 && s.sep, pressed && { opacity: 0.7 }]} onPress={() => { setMenu(null); setTimeout(a.run, 250); }} accessibilityRole="button">
                <View style={[s.rowIcon, a.danger && { backgroundColor: color.badBg }]}><Icon name={a.icon} size={19} color={a.danger ? color.bad : color.tealText} /></View>
                <Text style={[s.rowT, a.danger && { color: color.bad }]}>{a.label}</Text>
              </Pressable>
            )) : null}
            <Pressable style={s.cancel} onPress={() => setMenu(null)} accessibilityRole="button"><Text style={s.cancelT}>Vazgeç</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={!!auc} transparent animationType="slide" onRequestClose={() => setAuc(null)}>
        <Pressable style={s.backdrop} onPress={() => setAuc(null)} accessibilityLabel={tr('Kapat')}>
          <Pressable style={[s.sheet, { gap: 10 }]} onPress={() => undefined}>
            <Text style={s.aTitle}>Açık artırmaya çıkar</Text>
            {auc ? <PlainText style={s.sheetTitle} numberOfLines={1}>{auc.title}</PlainText> : null}
            <Text style={s.aK}>Başlangıç fiyatı (₺)</Text>
            <TextInput style={s.aIn} value={aStart} onChangeText={setAStart} keyboardType="number-pad" />
            <Text style={s.aK}>En az artış (₺)</Text>
            <TextInput style={s.aIn} value={aInc} onChangeText={setAInc} keyboardType="number-pad" />
            <Text style={s.aK}>Süre</Text>
            <View style={s.aSeg}>
              {[1, 3, 5, 7, 10].map((d) => (
                <Pressable key={d} style={[s.aSegI, aDays === d && { backgroundColor: color.teal }]} onPress={() => setADays(d)} accessibilityRole="radio" accessibilityState={{ selected: aDays === d }}>
                  <PlainText style={[s.aSegT, aDays === d && { color: color.tealInk }]}>{`${d} ${tr('gün')}`}</PlainText>
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

const s = StyleSheet.create({
  aTitle: { color: color.ink, fontFamily: font.bold, fontSize: 19 },
  aK: { color: color.muted, fontFamily: font.semi, fontSize: 13.5 },
  aIn: { minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: color.ink, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  aSeg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line },
  aSegI: { flex: 1, minHeight: 38, borderRadius: radius - 3, alignItems: 'center', justifyContent: 'center' },
  aSegT: { color: color.ink, fontFamily: font.semi, fontSize: 13.5 },
  aNote: { color: color.muted, fontSize: 12.5, lineHeight: 18 },
  aBtn: { minHeight: 50, borderRadius: radius, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  aBtnT: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  err: { color: color.bad, margin: 12 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  top: { flexDirection: 'row', gap: 12, padding: 12 },
  img: { width: 96, height: 76, borderRadius: radius },
  title: { fontFamily: font.semi, color: color.ink, fontSize: 15.5, lineHeight: 20 },
  price: { color: color.tealText, fontFamily: font.bold, fontSize: 15 },
  pill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  pillT: { fontFamily: font.semi, fontSize: 12.5 },
  quality: { borderTopWidth: 1, borderTopColor: color.line, paddingVertical: 9, paddingHorizontal: 12, gap: 5 },
  qLabel: { fontFamily: font.label, fontSize: 12.5, color: color.muted },
  qBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.plate, flexDirection: 'row', overflow: 'hidden' },
  qScore: { fontFamily: font.bold, fontSize: 14 },
  qTips: { fontSize: 12.5, lineHeight: 17, color: color.muted },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, paddingVertical: 9, paddingHorizontal: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statN: { color: color.ink, fontFamily: font.semi, fontSize: 13.5 },
  sum: { backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 10, marginBottom: 2, ...shadow },
  sumT: { color: color.ink, fontFamily: font.bold, fontSize: 16 },
  sumRow: { flexDirection: 'row' },
  sumItem: { flex: 1, alignItems: 'center', gap: 3 },
  sumN: { color: color.ink, fontFamily: font.bold, fontSize: 18 },
  sumL: { color: color.muted, fontSize: 12 },
  more: { position: 'absolute', top: 6, right: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 34 },
  sheetTitle: { color: color.muted, fontFamily: font.semi, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  sep: { borderTopWidth: 1, borderTopColor: color.line },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  rowT: { color: color.ink, fontFamily: font.semi, fontSize: 16 },
  cancel: { marginTop: 10, minHeight: 50, borderRadius: radius, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' },
  cancelT: { color: color.ink, fontFamily: font.semi, fontSize: 16 },
});
