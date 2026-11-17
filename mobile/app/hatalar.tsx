import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { PlainText, Text } from '../components/LText';
import { supabase } from '../lib/supabase';
import { color, font } from '../lib/theme';
import { localeOf, getLang } from '../lib/i18n';

/** Yönetici: uygulamadan gelen son hata kayıtları (çökme takibi, public.app_errors; 30 gün saklanır). */
type Err = { id: number; message: string; stack: string | null; fatal: boolean; platform: string | null; app_version: string | null; route: string | null; created_at: string };

export default function Errors() {
  const [rows, setRows] = useState<Err[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from('app_errors').select('id,message,stack,fatal,platform,app_version,route,created_at').order('created_at', { ascending: false }).limit(100);
    setRows((data ?? []) as Err[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={rows ?? []}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
      ListEmptyComponent={rows ? <Text style={s.empty}>Son 30 günde hata kaydı yok.</Text> : undefined}
      renderItem={({ item: e }) => (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {e.fatal ? <View style={s.fatal}><Text style={s.fatalT}>Çökme</Text></View> : null}
            <PlainText style={s.meta}>{[new Date(e.created_at).toLocaleString(localeOf(getLang())), e.platform, e.app_version, e.route].filter(Boolean).join(' · ')}</PlainText>
          </View>
          <PlainText style={s.msg} onPress={() => setOpen(open === e.id ? null : e.id)}>{e.message}</PlainText>
          {open === e.id && e.stack ? <PlainText style={s.stack} selectable>{e.stack}</PlainText> : null}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  empty: { textAlign: 'center', color: color.muted, marginTop: 24 },
  card: { backgroundColor: color.surface, borderRadius: 14, padding: 12, gap: 6 },
  meta: { color: color.muted, fontSize: 12.5, flex: 1 },
  msg: { color: color.ink, fontSize: 15, fontFamily: font.medium },
  stack: { color: color.muted, fontSize: 11.5, fontFamily: 'Courier' },
  fatal: { backgroundColor: color.badBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fatalT: { color: color.bad, fontSize: 12, fontFamily: font.semi },
});
