import { useCallback, useState } from 'react';
import { RowSkeleton } from '../components/kit';
import { GuestGate } from '../components/LoginPrompt';
import { Alert, FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { Icon } from '../components/Icon';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { getLang, localeOf, tr } from '../lib/i18n';
import { color, font, radius, shadow } from '../lib/theme';

type F = { cat?: string; catRaw?: string; city?: string; maxPrice?: number; q?: string; brand?: string; unit?: string; useMin?: string; useMax?: string; yMin?: string; yMax?: string; minScore?: number; ver?: boolean; hide?: boolean; takas?: boolean; near?: number; tech?: Record<string, unknown> };
type Saved = { id: string; query: { f?: F }; notify?: boolean | null; params?: unknown };

function label(f: F) {
  const parts = [f.q, f.cat && f.cat !== 'Tümü' ? tr(f.cat) : '', f.brand, f.city && f.city !== 'Tümü' ? f.city : '', f.maxPrice && f.maxPrice < 6000000 ? `≤ ${f.maxPrice.toLocaleString(localeOf(getLang()))} ₺` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : tr('Tüm ilanlar');
}

export default function SavedSearches() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Saved[] | null>(null);
  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    let r: { data: unknown; error: unknown } = await supabase.from('saved_searches').select('id,query,notify,params').eq('user_id', uid).order('created_at', { ascending: false });
    if (r.error) r = await supabase.from('saved_searches').select('id,query').eq('user_id', uid).order('created_at', { ascending: false });
    setRows(((r.data as Saved[] | null) ?? []));
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function toggle(item: Saved, on: boolean) {
    setRows((cur) => cur?.map((x) => (x.id === item.id ? { ...x, notify: on } : x)) ?? cur);
    const { error } = await supabase.from('saved_searches').update({ notify: on }).eq('id', item.id).eq('user_id', uid!);
    if (error) { Alert.alert(tr('Kayıtlı arama'), tr('Ayar kaydedilemedi.')); void load(); }
  }

  if (!session) return <GuestGate icon="bookmark" text="Kayıtlı aramalarını görmek için giriş yap." />;
  if (rows === null) return <RowSkeleton />;
  return (
    <FlatList
      style={{ backgroundColor: color.bg }}
      data={rows}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={rows.length ? <Text style={s.head}>Bildirim açık aramalara uyan yeni ilan gelince sana haber veririz.</Text> : undefined}
      ListEmptyComponent={<Text style={s.msg}>Kayıtlı aramanın yok. İlanlar sekmesinde "Aramayı kaydet"e dokun.</Text>}
      renderItem={({ item }) => {
        const f = item.query?.f ?? {};
        const canNotify = !!item.params;
        return (
          <View style={s.card}>
            <Pressable style={({ pressed }) => [s.top, pressed && { opacity: 0.8 }]} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/ilanlar', params: { q: f.q ?? '', cat: f.catRaw ?? (f.cat && f.cat !== 'Tümü' ? f.cat : ''), city: f.city ?? 'Tümü', maxPrice: String(f.maxPrice ?? 6000000), n: String(Date.now()), adv: JSON.stringify({ brand: f.brand ?? '', unit: f.unit === 'km' ? 'km' : 'sa', useMin: f.useMin ?? '', useMax: f.useMax ?? '', yMin: f.yMin ?? '', yMax: f.yMax ?? '', minScore: Number(f.minScore) || 0, ver: !!f.ver, hide: !!f.hide, takas: !!f.takas, near: Number(f.near) || 0, tech: f.tech ?? {} }) } })}>
              <View style={s.icon}><Icon name="search" size={17} color={color.tealText} /></View>
              <PlainText style={s.title} numberOfLines={2}>{label(f)}</PlainText>
              <Icon name="chevron-right" size={18} color={color.muted} />
            </Pressable>
            <View style={s.bottom}>
              <Icon name="bell" size={15} color={color.muted} />
              <Text style={s.notifyT}>{canNotify ? 'Yeni ilanlarda bildir' : 'Bildirim için aramayı yeniden kaydet'}</Text>
              {canNotify ? <Switch value={item.notify !== false} onValueChange={(v) => void toggle(item, v)} trackColor={{ true: color.teal, false: color.plate }} /> : null}
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Sil')} onPress={() => Alert.alert(tr('Kayıtlı arama'), tr('Silinsin mi?'), [{ text: tr('Vazgeç'), style: 'cancel' }, { text: tr('Sil'), style: 'destructive', onPress: async () => { await supabase.from('saved_searches').delete().eq('id', item.id).eq('user_id', uid!); void load(); } }])}>
                <Icon name="trash-2" size={18} color={color.bad} />
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  head: { color: color.muted, fontSize: 13.5, lineHeight: 19, marginHorizontal: 4 },
  card: { backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.semi, color: color.ink, fontSize: 15 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: 14, paddingVertical: 8, minHeight: 48 },
  notifyT: { flex: 1, color: color.ink, fontSize: 14 },
});
