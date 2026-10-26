import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { Text } from '../../components/LText';
import { useLocalSearchParams } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { common } from '../../components/ui';
import { trustLevel } from '../../lib/trust';
import { supabase, type Row } from '../../lib/supabase';

type Review = { who: string; role: string; rating: number; text: string; date: string; tags: string[] };
type Store = { name: string; store: boolean; premium: boolean; verified: boolean; city: string; bio: string; companyBio: string; since: number; s: number | null; b: number | null; deals: number; rep: number };

export default function StorePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [pr, st, ls, rv] = await Promise.all([
        supabase.from('profiles').select('full_name,store_name,is_store,is_premium,verified_phone,verified_id,verified_tax,city,district,bio,company_bio,created_at').eq('id', id).maybeSingle(),
        supabase.from('user_stats').select('*').eq('id', id).maybeSingle(),
        supabase.from('listings').select('id,title,price,city,year,listing_photos(path,position)').eq('seller_id', id).eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(100),
        supabase.from('reviews').select('score,comment,created_at,role,reviewer_id,tags').eq('reviewee_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!alive) return;
      const p = pr.data as Record<string, unknown> | null;
      if (p) {
        const s = (st.data ?? {}) as Record<string, number | string | undefined>;
        const split = s.seller_reviews !== undefined;
        const sellerN = Number(split ? s.seller_reviews : s.review_count ?? 0);
        const buyerN = Number(s.buyer_reviews ?? 0);
        const isStore = !!p.is_store;
        setStore({
          name: (isStore && (p.store_name as string)) || (p.full_name as string) || 'Üye', store: isStore, premium: !!p.is_premium,
          verified: !!p.verified_phone && (split ? !!p.verified_id && (!isStore || !!p.verified_tax) : true),
          city: [p.city, p.district].filter(Boolean).join(' / '), bio: (p.bio as string) ?? '', companyBio: (p.company_bio as string) ?? '',
          since: new Date(p.created_at as string).getFullYear(),
          s: sellerN > 0 ? Number(split ? s.seller_score : s.score) : null, b: buyerN > 0 ? Number(s.buyer_score) : null,
          deals: Number(s.deals ?? 0), rep: Number(s.reports ?? 0),
        });
      }
      setRows((ls.data ?? []) as unknown as Row[]);
      const rrows = (rv.data ?? []) as { score: number; comment: string | null; created_at: string; role: string; reviewer_id: string; tags?: string[] }[];
      const ids = [...new Set(rrows.map((r) => r.reviewer_id))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: ps } = await supabase.from('profiles').select('id,full_name,store_name,is_store').in('id', ids);
        for (const x of ps ?? []) names.set(x.id as string, ((x.is_store && x.store_name) || x.full_name || 'Üye') as string);
      }
      if (!alive) return;
      setReviews(rrows.map((r) => ({ who: names.get(r.reviewer_id) ?? 'Üye', role: r.role === 'seller' ? 'Alıcı' : 'Satıcı', rating: Number(r.score), text: r.comment ?? '', date: new Date(r.created_at).toLocaleDateString('tr-TR'), tags: r.tags ?? [] })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <ActivityIndicator style={{ margin: 24 }} />;
  if (!store) return <Text style={common.empty}>Satıcı bulunamadı.</Text>;
  const lv = trustLevel({ rep: store.rep, deals: store.deals, s: store.s });
  const fmt = (n: number | null) => (n == null ? '–' : n.toFixed(1).replace('.', ','));
  const header = (
    <View style={{ padding: 12, gap: 10 }}>
      <View style={common.card}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{store.name}</Text>
        <Text><Text style={{ color: lv.color, fontWeight: '700' }}>{lv.label}</Text> · {store.verified ? 'Doğrulanmış' : 'Doğrulanmadı'}{store.premium ? ' · Premium' : ''} · {store.store ? 'Mağaza' : 'Bireysel satıcı'}</Text>
        {store.bio ? <Text style={{ marginTop: 6 }}>{store.bio}</Text> : null}
        {store.store && store.companyBio ? <Text style={{ marginTop: 6 }}>{store.companyBio}</Text> : null}
        <Text style={common.meta}>Satıcı puanı {fmt(store.s)} · Alıcı puanı {fmt(store.b)} · {store.deals} onaylı işlem · {store.rep} doğrulanmış şikayet</Text>
        <Text style={common.meta}>Üyelik {store.since}{store.city ? ` · ${store.city}` : ''}</Text>
      </View>
      <Text style={common.h2}>İlanları ({rows.length})</Text>
      {rows.length === 0 ? <Text style={common.meta}>Aktif ilan yok.</Text> : null}
    </View>
  );
  return (
    <FlatList
      style={common.screen}
      data={rows}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => <ListingCard item={item} />}
      ListHeaderComponent={header}
      ListFooterComponent={(
        <View style={{ padding: 12, gap: 8 }}>
          <Text style={common.h2}>Değerlendirmeler ({reviews.length})</Text>
          {reviews.length === 0 ? <Text style={common.meta}>Henüz değerlendirme yok.</Text> : null}
          {reviews.map((r, i) => (
            <View key={i} style={common.card}>
              <Text style={common.title}>{r.who} <Text style={common.meta}>({r.role})</Text></Text>
              <Text style={common.price}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))} <Text style={common.meta}>{r.date}</Text></Text>
              {r.text ? <Text>{r.text}</Text> : null}
              {r.tags.length ? <Text style={common.meta}>{r.tags.join(' · ')}</Text> : null}
            </View>
          ))}
        </View>
      )}
    />
  );
}
