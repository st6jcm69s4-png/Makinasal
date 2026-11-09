import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlainText } from './LText';
import { Icon } from './Icon';
import { color, font, shadow } from '../lib/theme';
import { tr } from '../lib/i18n';

/**
 * Kısa bilgi bandı: "kaydedildi", "gönderildi" gibi başarı mesajları için.
 * Onay gerektirmeyen mesajlarda Alert yerine kullanılır (kullanıcıyı "Tamam"a basmaya zorlamaz).
 * Hata ve onay soruları Alert olarak kalır.
 */
type Kind = 'ok' | 'info';
type Item = { id: number; text: string; kind: Kind };
let push: ((t: Item) => void) | null = null;
let seq = 0;

/** Metin Türkçe kaynak olarak verilir; seçili dile burada çevrilir. */
export function toast(text: string, kind: Kind = 'ok') {
  const t = tr(text);
  AccessibilityInfo.announceForAccessibility(t);
  push?.({ id: ++seq, text: t, kind });
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<Item | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hide = () => Animated.timing(a, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) setItem(null); });
    push = (t) => {
      if (timer.current) clearTimeout(timer.current);
      setItem(t);
      Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      // Okuma süresi metnin uzunluğuna göre (en az 2,4 sn, en çok 5 sn)
      timer.current = setTimeout(hide, Math.min(5000, Math.max(2400, t.text.length * 55)));
    };
    return () => { push = null; if (timer.current) clearTimeout(timer.current); };
  }, [a]);

  if (!item) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.wrap, { bottom: insets.bottom + 76, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
    >
      <Pressable
        style={s.pill}
        accessibilityRole="alert"
        onPress={() => { if (timer.current) clearTimeout(timer.current); a.setValue(0); setItem(null); }}
      >
        <Icon name={item.kind === 'ok' ? 'check-circle' : 'info'} size={18} color={color.bg} />
        <PlainText style={s.text}>{item.text}</PlainText>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // Zemin ile ters renk: açık temada koyu, koyu temada açık bant
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 480, backgroundColor: color.ink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, ...shadow },
  text: { flexShrink: 1, color: color.bg, fontFamily: font.medium, fontSize: 14.5, lineHeight: 20 },
});
