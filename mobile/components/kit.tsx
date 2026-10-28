// Küçük arayüz kiti: shadcn/ui'daki Badge, Alert, Skeleton, Tabs, Avatar, Progress, Separator
// kalıplarının React Native uyarlaması. Renkler ve 4px köşe Makinasal'a aittir.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { PlainText, Text } from './LText';
import { Icon, type IconName } from './Icon';
import { color, font, radius } from '../lib/theme';

/* ───────── Badge ───────── */
export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
const BADGE: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
  default: { bg: color.accent, fg: '#fff', border: color.accent },
  secondary: { bg: color.plate, fg: color.ink, border: color.plate },
  outline: { bg: 'transparent', fg: color.ink, border: color.line },
  success: { bg: color.goodBg, fg: color.good, border: color.goodBg },
  warning: { bg: color.warnBg, fg: color.warn, border: color.warnBg },
  destructive: { bg: color.badBg, fg: color.bad, border: color.badBg },
};
export function Badge({ children, variant = 'secondary', icon }: { children: string | number; variant?: BadgeVariant; icon?: IconName }) {
  const v = BADGE[variant];
  return (
    <View style={[k.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      {icon ? <Icon name={icon} size={11} color={v.fg} /> : null}
      <Text style={[k.badgeText, { color: v.fg }]}>{String(children)}</Text>
    </View>
  );
}
/** Durum metnine göre rozet rengi (iş ağı ve moderasyon durumları). */
export function StatusBadge({ status, text }: { status: string; text: string }) {
  const variant: BadgeVariant = status === 'accepted' || status === 'open' || status === 'done' || status === 'contacted' ? 'success'
    : status === 'declined' || status === 'removed' || status === 'rejected' ? 'destructive'
    : status === 'pending' || status === 'new' ? 'warning' : 'secondary';
  return <Badge variant={variant}>{text}</Badge>;
}

/* ───────── Alert ───────── */
export function AlertBox({ variant = 'default', title, children, style }: { variant?: 'default' | 'destructive' | 'warning' | 'success'; title?: string; children?: string; style?: ViewStyle }) {
  const tone = variant === 'destructive' ? { bg: color.badBg, fg: color.bad, icon: 'alert-circle' as IconName }
    : variant === 'warning' ? { bg: color.warnBg, fg: color.warn, icon: 'alert-triangle' as IconName }
    : variant === 'success' ? { bg: color.goodBg, fg: color.good, icon: 'check-circle' as IconName }
    : { bg: color.plate, fg: color.ink, icon: 'info' as IconName };
  return (
    <View style={[k.alert, { backgroundColor: tone.bg, borderLeftColor: tone.fg }, style]} accessibilityRole="alert">
      <Icon name={tone.icon} size={18} color={tone.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[k.alertTitle, { color: tone.fg }]}>{title}</Text> : null}
        {children ? <Text style={{ color: tone.fg, fontSize: 14, lineHeight: 19 }}>{children}</Text> : null}
      </View>
    </View>
  );
}

/* ───────── Skeleton ───────── */
export function Skeleton({ width = '100%', height = 14, style }: { width?: number | `${number}%`; height?: number; style?: ViewStyle }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ width, height, backgroundColor: color.line, borderRadius: 2, opacity: o }, style]} />;
}
/** İlan kartı iskeleti: yüklenirken dönen çember yerine. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={k.skCard}>
          <View style={{ flexDirection: 'row' }}>
            <Skeleton width={112} height={92} style={{ borderRadius: 0 }} />
            <View style={{ flex: 1, padding: 10, gap: 10 }}>
              <Skeleton height={14} /><Skeleton width="55%" height={14} /><Skeleton width="40%" height={18} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, padding: 10, gap: 24 }}>
            <Skeleton width={40} height={12} /><Skeleton width={80} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={k.skRow}>
          <Skeleton width={56} height={56} style={{ borderRadius: radius }} />
          <View style={{ flex: 1, gap: 8 }}><Skeleton width="50%" height={14} /><Skeleton width="75%" height={12} /><Skeleton width="60%" height={12} /></View>
        </View>
      ))}
    </View>
  );
}

/* ───────── Tabs ───────── */
export type TabItem<T extends string> = { id: T; label: string; count?: number; icon?: IconName };
/** variant "filled": seçili sekme lacivert (ana bölüm anahtarı). "line": altı çizgili (alt bölümler). */
export function Tabs<T extends string>({ items, value, onChange, variant = 'filled' }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; variant?: 'filled' | 'line' }) {
  return (
    <View style={[k.tabs, variant === 'line' && { backgroundColor: color.bg }]} accessibilityRole="tablist">
      {items.map((t, i) => {
        const on = t.id === value;
        const filled = variant === 'filled';
        return (
          <Pressable
            key={t.id}
            style={[k.tab, filled ? { borderTopWidth: 3, borderTopColor: on ? color.accent : 'transparent', backgroundColor: on ? color.navy : 'transparent' } : { borderBottomWidth: 3, borderBottomColor: on ? color.accent : 'transparent' }, filled && i > 0 && { borderLeftWidth: 1, borderLeftColor: color.line }]}
            onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
          >
            {t.icon ? <Icon name={t.icon} size={16} color={on && filled ? '#fff' : on ? color.accentText : color.muted} /> : null}
            <Text style={[k.tabText, { color: on ? (filled ? '#fff' : color.ink) : color.muted }]}>{t.label}</Text>
            {t.count ? <Badge variant={on && filled ? 'outline' : 'default'}>{t.count}</Badge> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────── Avatar, Progress, Separator ───────── */
export function Avatar({ name, size = 44, uri, tone = 'navy' }: { name: string; size?: number; uri?: string | null; tone?: 'navy' | 'accent' }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toLocaleUpperCase('tr-TR')).join('') || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: tone === 'navy' ? color.navy : color.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <PlainText style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.42 }}>{ini}</PlainText>
    </View>
  );
}
export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={k.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color.accent }} />
    </View>
  );
}
export function Separator({ vertical }: { vertical?: boolean }) {
  return <View style={vertical ? { width: 1, alignSelf: 'stretch', backgroundColor: color.line } : { height: 1, backgroundColor: color.line }} />;
}

const k = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2, borderWidth: 1 },
  badgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
  alert: { flexDirection: 'row', gap: 10, padding: 12, borderLeftWidth: 3, borderRadius: radius, alignItems: 'flex-start' },
  alertTitle: { fontWeight: '700', fontSize: 14.5 },
  skCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius, overflow: 'hidden' },
  skRow: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  tabs: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.line },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  tabText: { fontSize: 14.5, fontFamily: font.bold },
  progress: { height: 8, backgroundColor: color.plate, borderWidth: 1, borderColor: color.line, overflow: 'hidden' },
});
