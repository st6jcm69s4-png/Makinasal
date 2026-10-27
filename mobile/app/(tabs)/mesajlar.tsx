import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { Icon } from '../../components/Icon';
import { Btn, Chip, Label } from '../../components/ui';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../lib/AppContext';
import { money, QUOTE_STATUS } from '../../lib/network';
import { initials } from '../../lib/person';
import { useTabScrollTop } from '../../lib/scrollTop';
import { photoUrl, supabase } from '../../lib/supabase';
import { color, font, radius } from '../../lib/theme';

type Thread = { id: string; title: string; other: string; photo: string | null; last: string; lastAt: string; mine: boolean; offer: boolean; unread: number };
type Quote = { id: string; post_id: string; other: string; title: string; amount: number; unit: string; status: string; at: string; incoming: boolean };

const short = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const day = (x: Date) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86400000);
  const diff = day(now) - day(d);
  if (diff === 0) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Dün';
  if (diff < 7) return d.toLocaleDateString('tr-TR', { weekday: 'short' });
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

export default function Messages() {
  const { session } = useApp();
  const me = session?.user.id;
  const scroller = useRef<never>(null);
  useTabScrollTop('mesajlar', scroller);
  const [mode, setMode] = useState<'ilan' | 'teklif'>('ilan');
  const [filter, setFilter] = useState<'all' | 'unread' | 'offer'>('all');
  const [q, setQ] = useState('');
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!me) { setThreads([]); return; }
    const { data, error: e } = await supabase.from('threads')
      .select('id,buyer_id,seller_id,created_at,listings(title,listing_photos(path,position))')
      .or(`buyer_id.eq.${me},seller_id.eq.${me}`).order('created_at', { ascending: false });
    if (e) { setError('Mesajlar yüklenemedi. Bağlantını kontrol et.'); setThreads([]); return; }
    setError('');
    type L = { title: string; listing_photos: { path: string; position: number }[] | null };
    const list = (data ?? []) as unknown as { id: string; buyer_id: string; seller_id: string; created_at: string; listings: L | L[] | null }[];
    const otherIds = [...new Set(list.map((t) => (t.buyer_id === me ? t.seller_id : t.buyer_id)))];
    const ids = list.map((t) => t.id);
    const msgQ = (cols: string) => supabase.from('messages').select(cols).in('thread_id', ids).order('created_at', { ascending: false }).limit(400);
    const [p, m0, u] = await Promise.all([
      otherIds.length ? supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', otherIds) : Promise.resolve({ data: [] }),
      ids.length ? msgQ('thread_id,sender_id,body,created_at,kind') : Promise.resolve({ data: [], error: null }),
      supabase.rpc('unread_counts'),
    ]);
    // Eski veritabanlarında "kind" sütunu olmayabilir: yoksa onsuz yeniden dene.
    const m = m0.error && ids.length ? await msgQ('thread_id,sender_id,body,created_at') : m0;
    const names: Record<string, string> = {};
    for (const r of (p.data ?? []) as { id: string; full_name: string | null; store_name: string | null; is_store: boolean | null }[]) names[r.id] = (r.is_store && r.store_name) || r.full_name || 'Kullanıcı';
    const lastBy: Record<string, { body: string; at: string; mine: boolean; offer: boolean }> = {};
    for (const x of ((m.data ?? []) as unknown as { thread_id: string; sender_id: string; body: string; created_at: string; kind?: string }[])) {
      if (!lastBy[x.thread_id]) lastBy[x.thread_id] = { body: x.body, at: x.created_at, mine: x.sender_id === me, offer: x.kind === 'offer' };
    }
    const unread: Record<string, number> = {};
    if (!u.error && Array.isArray(u.data)) for (const r of u.data as { thread_id: string; n: number | string }[]) unread[r.thread_id] = Number(r.n);
    setThreads(list.map((t) => {
      const l = Array.isArray(t.listings) ? t.listings[0] : t.listings;
      const ph = [...(l?.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
      const last = lastBy[t.id];
      return {
        id: t.id, title: l?.title ?? 'İlan', other: names[t.buyer_id === me ? t.seller_id : t.buyer_id] ?? 'Kullanıcı',
        photo: ph ? photoUrl(ph.path) : null, last: last?.body ?? 'Henüz mesaj yok', lastAt: last?.at ?? t.created_at, mine: !!last?.mine, offer: !!last?.offer, unread: unread[t.id] ?? 0,
      };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
    // Teklif konuşmaları (iş ağı)
    const qr = await supabase.from('market_quotes').select('id,post_id,owner_id,bidder_id,display_name,amount,price_unit,status,created_at,market_posts(title)').or(`owner_id.eq.${me},bidder_id.eq.${me}`).order('created_at', { ascending: false }).limit(50);
    if (!qr.error) {
      setQuotes(((qr.data ?? []) as unknown as { id: string; post_id: string; owner_id: string; bidder_id: string; display_name: string; amount: number; price_unit: string; status: string; created_at: string; market_posts: { title: string } | { title: string }[] | null }[]).map((x) => {
        const mp = Array.isArray(x.market_posts) ? x.market_posts[0] : x.market_posts;
        return { id: x.id, post_id: x.post_id, other: x.owner_id === me ? x.display_name : 'İlan sahibi', title: mp?.title ?? 'İş ağı ilanı', amount: Number(x.amount), unit: x.price_unit, status: x.status, at: x.created_at, incoming: x.owner_id === me };
      }));
    }
  }, [me]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!session) {
    return (
      <View style={s.center}>
        <Icon name="message-square" size={34} color={color.accent} />
        <Text style={s.emptyT}>Mesajların burada görünür</Text>
        <Text style={s.emptyS}>Alıcı ve satıcılarla yazışmak, teklifleri takip etmek için giriş yap.</Text>
        <Btn title="Giriş yap" onPress={() => router.navigate('/hesap')} />
      </View>
    );
  }
  if (threads === null) return <ActivityIndicator style={{ margin: 32 }} />;

  const term = q.trim().toLocaleLowerCase('tr-TR');
  const shown = threads.filter((t) => (filter === 'unread' ? t.unread > 0 : filter === 'offer' ? t.offer : true) && (!term || `${t.other} ${t.title} ${t.last}`.toLocaleLowerCase('tr-TR').includes(term)));
  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);

  const head = (
    <View>
      <View style={s.modes}>
        {([['ilan', 'İlan mesajları', totalUnread], ['teklif', 'Teklifler', quotes.filter((x) => x.status === 'pending' && x.incoming).length]] as ['ilan' | 'teklif', string, number][]).map(([k, l, n], i) => (
          <Pressable key={k} style={[s.mode, i > 0 && { borderLeftWidth: 1, borderLeftColor: color.line }, mode === k && s.modeOn]} onPress={() => setMode(k)} accessibilityRole="button" accessibilityState={{ selected: mode === k }}>
            <Text style={[s.modeText, mode === k && { color: '#fff' }]}>{l}</Text>
            {n > 0 ? <View style={[s.dot, mode === k && { backgroundColor: '#fff' }]}><Text style={[s.dotText, mode === k && { color: color.accent }]}>{n}</Text></View> : null}
          </Pressable>
        ))}
      </View>
      {mode === 'ilan' ? (
        <View style={{ padding: 12, gap: 10 }}>
          <View style={s.search}>
            <Icon name="search" size={18} color={color.muted} />
            <TextInput style={s.searchInput} placeholder="Kişi, ilan veya mesaj ara" placeholderTextColor="#9A949A" value={q} onChangeText={setQ} />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Temizle"><Icon name="x" size={18} color={color.muted} /></Pressable> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip title="Tümü" on={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip title={totalUnread ? `Okunmamış (${totalUnread})` : 'Okunmamış'} on={filter === 'unread'} onPress={() => setFilter('unread')} />
            <Chip title="Teklifler" on={filter === 'offer'} onPress={() => setFilter('offer')} />
          </View>
        </View>
      ) : <View style={{ height: 12 }} />}
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );

  return (
    <FlatList<Thread | Quote>
      ref={scroller}
      style={{ flex: 1, backgroundColor: color.bg }}
      data={mode === 'ilan' ? shown : quotes}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
      ListHeaderComponent={head}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyT}>{mode === 'ilan' ? (threads.length ? 'Aramana uygun konuşma yok' : 'Henüz mesajın yok') : 'Henüz teklif konuşman yok'}</Text>
          <Text style={s.emptyS}>{mode === 'ilan' ? (threads.length ? 'Filtreyi değiştirmeyi dene.' : 'Bir ilanda "Mesaj gönder"e dokunarak satıcıyla yazışmaya başla.') : 'İş ağında bir ilana teklif verince ya da ilanına teklif gelince burada görünür.'}</Text>
          {!threads.length && mode === 'ilan' ? <Btn title="İlanlara göz at" onPress={() => router.navigate('/ilanlar')} /> : null}
        </View>
      }
      renderItem={({ item }) => 'unread' in item ? (
        <Pressable style={({ pressed }) => [s.row, pressed && { backgroundColor: color.plate }]} onPress={() => router.push(`/mesaj/${item.id}`)} accessibilityRole="button">
          {item.photo ? <Image source={{ uri: item.photo }} style={s.thumb} /> : <View style={[s.thumb, s.avatar]}><PlainText style={s.avatarText}>{initials(item.other)}</PlainText></View>}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PlainText style={[s.other, item.unread > 0 && { color: color.ink }]} numberOfLines={1}>{item.other}</PlainText>
              <Text style={s.time}>{short(item.lastAt)}</Text>
            </View>
            <Text style={s.listing} numberOfLines={1}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.mine ? <Icon name="check" size={14} color={color.muted} /> : null}
              {item.offer ? <Label style={{ color: color.accent }}>Teklif</Label> : null}
              <Text style={[s.last, item.unread > 0 && { color: color.ink, fontWeight: '600' }]} numberOfLines={1}>{item.last}</Text>
              {item.unread > 0 ? <View style={s.badge}><Text style={s.badgeText}>{item.unread}</Text></View> : null}
            </View>
          </View>
        </Pressable>
      ) : (
        <Pressable style={({ pressed }) => [s.row, pressed && { backgroundColor: color.plate }]} onPress={() => router.push(`/ag/ilan/${item.post_id}` as never)} accessibilityRole="button">
          <View style={[s.thumb, s.avatar]}><Icon name={item.incoming ? 'inbox' : 'send'} size={22} color="#fff" /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PlainText style={s.other} numberOfLines={1}>{item.incoming ? `Gelen: ${item.other}` : 'Verdiğin teklif'}</PlainText>
              <Text style={s.time}>{short(item.at)}</Text>
            </View>
            <Text style={s.listing} numberOfLines={1}>{item.title}</Text>
            <Text style={s.last}>{money(item.amount, item.unit)} · {QUOTE_STATUS[item.status] ?? item.status}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: color.bg },
  modes: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  mode: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 3, borderTopColor: 'transparent' },
  modeOn: { backgroundColor: color.navy, borderTopColor: color.accent },
  modeText: { fontSize: 15, fontFamily: font.bold, color: color.ink },
  dot: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, paddingHorizontal: 10 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16, color: color.ink },
  err: { color: color.bad, marginHorizontal: 12 },
  empty: { alignItems: 'center', gap: 10, padding: 28 },
  emptyT: { fontSize: 17, fontWeight: '700', color: color.ink, textAlign: 'center' },
  emptyS: { color: color.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  thumb: { width: 56, height: 56, borderRadius: radius, backgroundColor: color.plate },
  avatar: { backgroundColor: color.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.bold, fontSize: 20 },
  other: { flex: 1, fontSize: 16, fontFamily: font.semi, color: color.ink },
  time: { color: color.muted, fontSize: 12.5 },
  listing: { color: color.accent, fontSize: 13.5, fontWeight: '500' },
  last: { flex: 1, color: color.muted, fontSize: 14.5 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
