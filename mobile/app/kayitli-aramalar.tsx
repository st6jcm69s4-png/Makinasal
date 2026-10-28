import { useCallback, useState } from 'react';
import { GuestGate } from '../components/LoginPrompt';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { getLang, localeOf } from '../lib/i18n';
import { color } from '../lib/theme';

type F = { cat?: string; city?: string; maxPrice?: number; q?: string; brand?: string };
type Saved = { id: string; query: { f?: F } };

function label(f: F) {
  const parts = [f.q, f.cat && f.cat !== 'Tümü' ? f.cat : '', f.brand, f.city && f.city !== 'Tümü' ? f.city : '', f.maxPrice && f.maxPrice < 6000000 ? `≤ ${f.maxPrice.toLocaleString(localeOf(getLang()))} ₺` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Tüm ilanlar';
}

export default function SavedSearches() {
  const { session } = useApp();
  const uid = session?.user.id;
  const [rows, setRows] = useState<Saved[] | null>(null);
  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    const { data } = await supabase.from('saved_searches').select('id,query').eq('user_id', uid).order('created_at', { ascending: false });
    setRows((data ?? []) as unknown as Saved[]);
  }, [uid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!session) return <GuestGate icon="bookmark" text="Kayıtlı aramalarını görmek için giriş yap." />;
  if (rows === null) return <ActivityIndicator style={{ margin: 32 }} />;
  return (
    <FlatList
      style={{ backgroundColor: color.bg }}
      data={rows}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      ListEmptyComponent={<Text style={s.msg}>Kayıtlı aramanın yok. İlanlar sekmesinde "Aramayı kaydet"e dokun.</Text>}
      renderItem={({ item }) => {
        const f = item.query?.f ?? {};
        return (
          <View style={s.card}>
            <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/ilanlar', params: { q: f.q ?? '', cat: f.cat && f.cat !== 'Tümü' ? f.cat : '', city: f.city ?? 'Tümü', maxPrice: String(f.maxPrice ?? 6000000) } })}>
              <Text style={s.title}>{label(f)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => Alert.alert('Kayıtlı arama', 'Silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('saved_searches').delete().eq('id', item.id).eq('user_id', uid!); void load(); } }])}>
              <Text style={s.del}>Sil</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}
const s = StyleSheet.create({
  msg: { textAlign: 'center', color: color.muted, margin: 24 },
  card: { backgroundColor: color.surface, padding: 14, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontWeight: '600', color: color.ink },
  del: { color: color.bad },
});
