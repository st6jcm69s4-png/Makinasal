import { useCallback, useState } from 'react';
import { GuestGate } from '../components/LoginPrompt';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { Icon, type IconName } from '../components/Icon';
import { tr } from '../lib/i18n';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { photoUrl, supabase, tl } from '../lib/supabase';
import { color, font, radius, shadow } from '../lib/theme';

type Row = {
  id: string; title: string; price: number | string; city: string; status: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | null; listing_photos: { path: string; position: number }[] | null;
};
const COLS = 'id,title,price,city,status,moderation_status,listing_photos(path,position)';

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

  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    const { data, error: e } = await supabase.from('listings').select(COLS).eq('seller_id', uid).neq('status', 'removed').order('created_at', { ascending: false });
    if (e) { setError('İlanların yüklenemedi. Bağlantını kontrol et.'); setRows([]); return; }
    setError(''); setRows((data ?? []) as unknown as Row[]);
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function patch(id: string, status: string) {
    const { error: e } = await supabase.from('listings').update({ status }).eq('id', id);
    if (e) Alert.alert('İlan', e.message.includes('limit') || e.message.includes('limitine') ? 'İlan limitine ulaştın.' : 'İşlem kaydedilemedi.');
    void load();
  }
  function confirm(r: Row, status: string, text: string, yes: string, danger = false) {
    Alert.alert(r.title, tr(text), [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr(yes), style: danger ? 'destructive' : 'default', onPress: () => void patch(r.id, status) }]);
  }
  function actions(r: Row): Action[] {
    const list: Action[] = [{ icon: 'edit-2', label: 'Düzenle', run: () => router.push(`/ilan-ver?duzenle=${r.id}`) }];
    if (r.status === 'active') {
      list.push({ icon: 'check-circle', label: 'Satıldı', run: () => confirm(r, 'sold', 'Bu ilan satıldı olarak işaretlensin mi? İlan yayından kalkar.', 'Evet, satıldı') });
      list.push({ icon: 'pause-circle', label: 'Duraklat', run: () => void patch(r.id, 'paused') });
    }
    if (r.status === 'paused') list.push({ icon: 'play-circle', label: 'Yayına al', run: () => void patch(r.id, 'active') });
    list.push({ icon: 'trash-2', label: 'Kaldır', danger: true, run: () => confirm(r, 'removed', 'İlan kaldırılsın mı? İşlem ve değerlendirme geçmişi korunur.', 'Kaldır', true) });
    return list;
  }

  if (!session) return <GuestGate icon="list" text="İlanlarını görmek ve yönetmek için giriş yap." />;
  if (rows === null) return <ActivityIndicator style={{ margin: 32 }} />;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Text style={s.msg}>Henüz ilanın yok.</Text>}
        renderItem={({ item: r }) => {
          const photo = [...(r.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
          return (
            <View style={s.card}>
              <Pressable style={s.top} onPress={() => router.push(`/ilan/${r.id}`)} accessibilityRole="button">
                {photo ? <Image source={{ uri: photoUrl(photo.path) }} style={s.img} /> : <View style={[s.img, { backgroundColor: color.plate }]} />}
                <View style={{ flex: 1, gap: 4, paddingRight: 34 }}>
                  <Text style={s.title} numberOfLines={2}>{r.title}</Text>
                  <PlainText style={s.price}>{`${tl(r.price)} · ${r.city}`}</PlainText>
                  <View style={[s.pill, { backgroundColor: statusTone(r).bg }]}><Text style={[s.pillT, { color: statusTone(r).fg }]}>{statusText(r)}</Text></View>
                </View>
              </Pressable>
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
    </View>
  );
}

const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  err: { color: color.bad, margin: 12 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  top: { flexDirection: 'row', gap: 12, padding: 12 },
  img: { width: 96, height: 76, borderRadius: radius },
  title: { fontFamily: font.semi, color: color.ink, fontSize: 15.5, lineHeight: 20 },
  price: { color: color.tealText, fontFamily: font.bold, fontSize: 15 },
  pill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  pillT: { fontFamily: font.semi, fontSize: 12.5 },
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
