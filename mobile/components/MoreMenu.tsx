import { useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LText';
import { Icon, type IconName } from './Icon';
import { tr } from '../lib/i18n';
import { color, font } from '../lib/theme';
import { EASE_OUT, SPRING_SETTLE, reduceMotion } from '../lib/motion';

export type MenuItem = { label: string; icon: IconName; sf: string; danger?: boolean; run: () => void };

/*
 * "Daha fazla" (…) menüsü, Android ve yedek sürüm. iPhone'da MoreMenu.ios.tsx (sistemin kendi menüsü) kullanılır.
 * Apple'ın açılır menü düzeni: düğmenin hemen altından küçük bir kart çıkar; ekranı kaplamaz, arka plan
 * kararmaz, dışarı dokununca kapanır. Satırda yazı solda, simge sağda; tehlikeli seçenek kırmızı ve en altta.
 */
const W = 250;
const ROW = 46;

export function MoreMenu({ items, label = 'İlan seçenekleri' }: { items: MenuItem[]; label?: string }) {
  const btn = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const a = useRef(new Animated.Value(0)).current;

  const open = () => {
    btn.current?.measureInWindow((x, y, w, h) => {
      const { width, height } = Dimensions.get('window');
      const menuH = items.length * ROW + 8;
      const up = y + h + menuH + 24 > height; // altta yer yoksa yukarı açılır
      setPos({ top: up ? Math.max(24, y - menuH - 6) : y + h + 4, right: Math.max(8, width - (x + w)), up });
      a.setValue(0);
      if (reduceMotion()) a.setValue(1);
      else Animated.spring(a, { ...SPRING_SETTLE, toValue: 1 }).start();
    });
  };
  const close = (then?: () => void) => {
    Animated.timing(a, { toValue: 0, duration: 120, easing: EASE_OUT, useNativeDriver: true }).start(() => {
      setPos(null);
      if (then) setTimeout(then, 30);
    });
  };

  return (
    <>
      <Pressable ref={btn as never} onPress={open} hitSlop={8} style={({ pressed }) => [s.btn, pressed && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={tr(label)}>
        <View style={s.dot}><Icon name="more-horizontal" size={18} color={color.accentText} /></View>
      </Pressable>
      <Modal visible={!!pos} transparent animationType="none" onRequestClose={() => close()}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel={tr('Kapat')} />
        {pos ? (
          <Animated.View
            style={[s.card, { top: pos.top, right: pos.right, opacity: a, transformOrigin: pos.up ? 'bottom right' : 'top right', transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
            accessibilityRole="menu"
          >
            {items.map((it, i) => (
              <Pressable key={it.label} onPress={() => close(it.run)} style={({ pressed }) => [s.row, i > 0 && s.sep, pressed && { backgroundColor: color.plate }]} accessibilityRole="menuitem">
                <Text style={[s.label, it.danger && { color: color.bad }]} numberOfLines={1}>{it.label}</Text>
                <Icon name={it.icon} size={18} color={it.danger ? color.bad : color.ink} />
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.plate, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute', width: W, borderRadius: 14, backgroundColor: color.surface, overflow: 'hidden', paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  row: { minHeight: ROW, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  label: { flex: 1, color: color.ink, fontSize: 16, fontFamily: font.regular },
});
