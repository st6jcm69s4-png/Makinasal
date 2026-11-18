import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text } from './LText';
import { Heart, Icon } from './Icon';
import { useApp } from '../lib/AppContext';
import { useLoginPrompt } from './LoginPrompt';
import { router } from 'expo-router';
import { dateLabel, money, PERSONNEL_ROLES, PROVIDER_KINDS, RENTAL_MODES, type MarketPost, type Provider } from '../lib/network';
import { color, font, radius } from '../lib/theme';
import { isPersonDetails } from '../lib/personProfile';
import { tr } from '../lib/i18n';
import { getLang, localeOf } from '../lib/i18n';

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

const KIND_SHORT: Record<string, string> = { rental_machine: 'Kiralık', job: 'İş talebi', part_request: 'Parça talebi', staff_wanted: 'Eleman ilanı', rental_operator: 'Hazır eleman' };
const CTA: Record<string, string> = { rental_machine: 'Teklif iste', job: 'Teklif ver', part_request: 'Teklif ver', staff_wanted: 'Başvur', rental_operator: 'İletişime geç' };

function whenLabel(iso: string) {
  const d = new Date(iso), days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return tr('Bugün');
  if (days === 1) return tr('Dün');
  if (days < 7) return `${days} ${tr('gün')}`;
  return d.toLocaleDateString(localeOf(getLang()), { day: 'numeric', month: 'short' });
}

/*
 * İş ağı ilan kartı (onaylı taslak, 9 Kasım): üstte tür ve tarih, başlık, yer ve tarih bilgisi;
 * altta çizgiyle ayrılmış fiyat ve eylem düğmesi ("Teklif iste" / "Başvur" ...).
 */
export function PostCard({ p }: { p: MarketPost }) {
  const who = p.personnel_role ? PERSONNEL_ROLES[p.personnel_role as keyof typeof PERSONNEL_ROLES] : p.rental_mode ? RENTAL_MODES[p.rental_mode as keyof typeof RENTAL_MODES] : p.category;
  const open = () => router.push(`/ag/ilan/${p.id}` as never);
  const where = [p.city, p.district].filter(Boolean).join(', ');
  const date = p.start_date ? `${dateLabel(p.start_date)}${p.end_date ? ` – ${dateLabel(p.end_date)}` : ''}` : '';
  const price = p.price == null ? (p.kind === 'rental_operator' ? tr('Görüşülür') : tr('Fiyat sorun')) : money(p.price, p.price_unit).replace(' toplam', '');
  const person = isPersonDetails(p.details) ? `${p.details.years} ${tr('yıl deneyim')} · ${p.details.machines.slice(0, 3).map((m) => tr(m)).join(', ')}` : '';
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.pressed]} onPress={open} accessibilityRole="button">
      <View style={s.head}>
        <PlainText style={s.kind} numberOfLines={1}>{[tr(KIND_SHORT[p.kind] ?? ''), who ? tr(who) : ''].filter(Boolean).join(' · ').toLocaleUpperCase(getLang() === 'tr' ? 'tr-TR' : undefined)}</PlainText>
        <PlainText style={s.when}>{whenLabel(p.created_at)}</PlainText>
        <NetHeart kind="post" id={p.id} />
      </View>
      <Text style={s.title} numberOfLines={2}>{p.title}</Text>
      {where || date || person ? (
        <View style={s.meta}>
          {where ? <View style={s.metaItem}><Icon name="map-pin" size={13} color={color.muted} /><PlainText style={s.metaT} numberOfLines={1}>{where}</PlainText></View> : null}
          {date ? <View style={s.metaItem}><Icon name="calendar" size={13} color={color.muted} /><PlainText style={s.metaT} numberOfLines={1}>{date}</PlainText></View> : null}
          {person ? <View style={s.metaItem}><Icon name="award" size={13} color={color.muted} /><PlainText style={s.metaT} numberOfLines={1}>{person}</PlainText></View> : null}
        </View>
      ) : null}
      <View style={s.foot}>
        <PlainText style={s.price} numberOfLines={1}>{price}</PlainText>
        <Pressable style={({ pressed }) => [s.cta, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]} onPress={open} accessibilityRole="button" hitSlop={4}>
          <Text style={s.ctaT}>{CTA[p.kind] ?? 'İncele'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function FirmCard({ p }: { p: Provider }) {
  const open = () => router.push(`/firma/${p.user_id}` as never);
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.pressed]} onPress={open} accessibilityRole="button">
      <View style={s.head}>
        <PlainText style={s.kind} numberOfLines={1}>{tr(p.company_category ?? PROVIDER_KINDS[p.kind]).toLocaleUpperCase(getLang() === 'tr' ? 'tr-TR' : undefined)}</PlainText>
        <NetHeart kind="firm" id={p.user_id} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={s.roleIcon}><Icon name={p.kind === 'tow' ? 'life-buoy' : 'briefcase'} size={22} color={color.tealText} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.title} numberOfLines={2}>{p.name}</Text>
          {p.description ? <Text style={s.desc} numberOfLines={2}>{p.description}</Text> : null}
        </View>
      </View>
      <View style={s.meta}>
        {p.city ? <View style={s.metaItem}><Icon name="map-pin" size={13} color={color.muted} /><PlainText style={s.metaT}>{p.city}</PlainText></View> : null}
        <View style={s.metaItem}><Icon name="navigation" size={13} color={color.muted} /><PlainText style={s.metaT}>{`${p.service_cities.length} ${tr('ilde hizmet')}`}</PlainText></View>
        {p.specialties[0] ? <View style={s.metaItem}><Icon name="tool" size={13} color={color.muted} /><PlainText style={s.metaT} numberOfLines={1}>{tr(p.specialties[0])}</PlainText></View> : null}
      </View>
      <View style={s.foot}>
        <View style={{ flex: 1 }} />
        <Pressable style={({ pressed }) => [s.ctaGhost, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={open} accessibilityRole="button" hitSlop={4}>
          <Text style={s.ctaGhostT}>Firmayı gör</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}


const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 14, gap: 8, backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, borderRadius: radius + 6 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kind: { flex: 1, color: color.tealText, fontFamily: font.semi, fontSize: 12, letterSpacing: 0.6 },
  when: { color: color.muted, fontSize: 12.5 },
  title: { fontSize: 17.5, fontFamily: font.semi, color: color.ink, lineHeight: 23 },
  desc: { color: color.muted, fontSize: 14, lineHeight: 19 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  metaT: { color: color.muted, fontSize: 13.5, flexShrink: 1 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  price: { flex: 1, color: color.tealText, fontFamily: font.bold, fontSize: 19 },
  cta: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  ctaT: { color: color.tealInk, fontFamily: font.semi, fontSize: 15 },
  ctaGhost: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  ctaGhostT: { color: color.tealText, fontFamily: font.semi, fontSize: 15 },
});
