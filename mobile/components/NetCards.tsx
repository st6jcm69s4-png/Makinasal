import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Heart, Icon, type IconName } from './Icon';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from './LoginPrompt';
import { Label } from './ui';
import { Badge } from './kit';
import { router } from 'expo-router';
import { dateLabel, money, PERSONNEL_ROLES, PROVIDER_KINDS, RENTAL_MODES, type MarketPost, type Provider } from '../lib/network';
import { color, radius } from '../lib/theme';
import { getLang, localeOf } from '../lib/i18n';

const ROLE_ICON: Record<string, IconName> = { operator: 'settings', driver: 'truck', mechanic: 'tool' };

function Cell({ label, value, flex = 1, left }: { label: string; value: string; flex?: number; left?: boolean }) {
  return (
    <View style={[s.cell, { flex }, left && s.cellL]}>
      <Label>{label}</Label>
      <Text style={s.val} numberOfLines={1}>{value || '–'}</Text>
    </View>
  );
}

function NetHeart({ kind, id }: { kind: 'post' | 'firm'; id: string }) {
  const { netFavs, toggleNetFav } = useApp();
  const { notify } = useLoginPrompt();
  const on = netFavs.has(`${kind}:${id}`);
  return (
    <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={on ? 'Favorilerden çıkar' : 'Favorilere ekle'} onPress={async () => { const err = await toggleNetFav(kind, id); if (err) notify('Favoriler', err, (a) => void a.toggleNetFav(kind, id)); }} style={{ padding: 2 }}>
      <Heart on={on} size={22} color={on ? color.accent : color.muted} />
    </Pressable>
  );
}

export function PostCard({ p }: { p: MarketPost }) {
  const fresh = Date.now() - new Date(p.created_at).getTime() < 3 * 86400000;
  const who = p.personnel_role ? PERSONNEL_ROLES[p.personnel_role as keyof typeof PERSONNEL_ROLES] : p.rental_mode ? RENTAL_MODES[p.rental_mode as keyof typeof RENTAL_MODES] : p.category;
  const isStaff = p.kind === 'staff_wanted';
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/ag/ilan/${p.id}` as never)} accessibilityRole="button">
      <View style={s.cardTop}>
        {p.personnel_role ? <View style={s.roleIcon}><Icon name={ROLE_ICON[p.personnel_role] ?? 'user'} size={22} color={color.accent} /></View> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Label style={{ color: color.accent }}>{who}</Label>
            {fresh ? <Badge variant="default">YENİ</Badge> : null}
          </View>
          <Text style={s.title} numberOfLines={2}>{p.title}</Text>
        </View>
        <NetHeart kind="post" id={p.id} />
      </View>
      <View style={s.strip}>
        <Cell label="İl" value={p.city} />
        <Cell label={p.start_date ? 'Başlangıç' : 'Yayın'} value={p.start_date ? dateLabel(p.start_date) : new Date(p.created_at).toLocaleDateString(localeOf(getLang()))} left />
        <Cell label={isStaff ? 'Ücret' : 'Bütçe'} value={p.price == null ? 'Belirtilmedi' : money(p.price, p.price_unit).replace(' toplam', '')} flex={1.4} left />
      </View>
    </Pressable>
  );
}
export function FirmCard({ p }: { p: Provider }) {
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/firma/${p.user_id}` as never)} accessibilityRole="button">
      <View style={s.cardTop}>
        <View style={s.roleIcon}><Icon name={p.kind === 'tow' ? 'life-buoy' : 'briefcase'} size={22} color={color.accent} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Label style={{ color: color.accent }}>{p.company_category ?? PROVIDER_KINDS[p.kind]}</Label>
          <Text style={s.title} numberOfLines={2}>{p.name}</Text>
          <Text style={s.desc} numberOfLines={2}>{p.description}</Text>
        </View>
        <NetHeart kind="firm" id={p.user_id} />
      </View>
      <View style={s.strip}>
        <Cell label="İl" value={p.city} />
        <Cell label="Hizmet bölgesi" value={`${p.service_cities.length} il`} left />
        <Cell label="İş alanı" value={p.specialties[0] ?? ''} flex={1.4} left />
      </View>
    </Pressable>
  );
}


const s = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  roleIcon: { width: 44, height: 44, borderRadius: radius, backgroundColor: color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: color.ink },
  desc: { color: color.muted, fontSize: 14 },
  fresh: { backgroundColor: color.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2 },
  freshText: { color: '#fff', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line },
  cell: { paddingVertical: 7, paddingHorizontal: 12, gap: 1 },
  cellL: { borderLeftWidth: 1, borderLeftColor: color.line },
  val: { fontSize: 15, color: color.ink, fontWeight: '500' },
});
