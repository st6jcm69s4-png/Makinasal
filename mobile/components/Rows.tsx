import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Icon, type IconName } from './Icon';
import { color, font } from '../lib/theme';

/*
 * iPhone "Ayarlar" görünümündeki gruplu satırlar (inset grouped list):
 * - beyaz kart, gölgesiz ve çerçevesiz; satırlar arasında simgeden sonra başlayan ince çizgi,
 * - solda renkli kare içinde beyaz simge, sağda değer / rozet / ok,
 * - basınca satır griye döner (solma değil), en az 48 pt yükseklik.
 * Android'de de aynı çizilir (iki platformda tek görünüm).
 */
export type Tint = 'accent' | 'green' | 'red' | 'gray' | 'purple' | 'gold' | 'ink';
// Simge kareleri sabit renklerdir (Ayarlar uygulamasındaki gibi); "accent" seçili temanın rengini izler.
const TILE: Record<Tint, string> = { accent: color.teal, green: '#2E9D57', red: '#E5484D', gray: '#8E8E93', purple: '#8E5BD6', gold: '#C99A06', ink: '#4B4F57' };

export type Item = {
  icon?: IconName; tint?: Tint; label: string; sub?: string; value?: string;
  go: () => void; badge?: number | string; destructive?: boolean;
};

export function Row({ it, last }: { it: Item; last: boolean }) {
  return (
    <Pressable style={({ pressed }) => [s.row, pressed && { backgroundColor: color.plate }]} onPress={it.go} accessibilityRole="button" accessibilityLabel={[it.label, it.sub, it.value, it.badge ? String(it.badge) : ''].filter(Boolean).join(', ')}>
      {it.icon && !it.destructive ? <View style={[s.tile, { backgroundColor: TILE[it.tint ?? 'accent'] }]}><Icon name={it.icon} size={17} color="#FFFFFF" /></View> : null}
      <View style={[s.main, !last && s.line, !it.icon && { marginLeft: 0 }]}>
        <View style={{ flex: 1, paddingVertical: it.sub ? 9 : 12 }}>
          <Text style={[s.label, it.destructive && { color: color.bad, textAlign: 'center' }]}>{it.label}</Text>
          {it.sub ? <Text style={s.sub} numberOfLines={2}>{it.sub}</Text> : null}
        </View>
        {it.value ? <Text style={s.value} numberOfLines={1}>{it.value}</Text> : null}
        {it.badge ? <View style={s.badge}><Text style={s.badgeText}>{it.badge}</Text></View> : null}
        {it.destructive ? null : <View style={{ opacity: 0.55 }}><Icon name="chevron-right" size={18} color={color.muted} /></View>}
      </View>
    </Pressable>
  );
}

/** Bir grup: üstte küçük başlık, altta isteğe bağlı açıklama. */
export function Group({ title, footer, items, children }: { title?: string; footer?: string; items?: Item[]; children?: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      {title ? <Text style={s.title} accessibilityRole="header">{title}</Text> : null}
      <View style={s.group}>
        {children}
        {items?.map((it, i) => <Row key={it.label} it={it} last={i === items.length - 1} />)}
      </View>
      {footer ? <Text style={s.footer}>{footer}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 13, color: color.muted, marginLeft: 16, textTransform: 'none' },
  footer: { fontSize: 13, lineHeight: 18, color: color.muted, marginHorizontal: 16 },
  group: { backgroundColor: color.surface, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 48 },
  tile: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14, minHeight: 48 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  label: { fontSize: 16.5, color: color.ink },
  sub: { fontSize: 13, color: color.muted, marginTop: 1 },
  value: { fontSize: 15.5, color: color.muted, maxWidth: 150 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.bad, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 12.5, fontFamily: font.textBold },
});
