import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { reduceMotion } from '../lib/motion';
import * as haptic from '../lib/haptics';

/*
 * Yan yana seçim kutuları (ör. İş Ağı: İş arıyorum / Eleman arıyorum / Makine ve iş).
 * Seçilen kutu uzunlamasına bir dikdörtgene dönüşür: yukarı doğru uzar ve biraz genişler;
 * diğerleri hafifçe küçülür (%95). Alt kenarlar hizalı kalır, satırın yüksekliği değişmez
 * (alttaki içerik zıplamaz).
 *
 * Hareket: Apple'ın "yumuşak" yayı (zıplamasız, ~0,45 sn). Araya girilebilir: hareket bitmeden
 * başka kutuya basılırsa oradan yeni hedefe akar. Basılıyken kutu hafifçe küçülür.
 * Seçim değişince hafif titreşim. "Hareketi azalt" açıksa anında değişir.
 */
const SMOOTH = { stiffness: 220, damping: 26, mass: 1 } as const; // sönüm oranı ≈ 0,88
const PRESS = { stiffness: 500, damping: 34, mass: 1 } as const;

export function ChoiceRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[x.row, style]}>{children}</View>;
}

type Props = {
  on: boolean;
  onPress: () => void;
  /** Seçili değilken yükseklik */
  height: number;
  /** Seçiliyken yükseklik (uzunlamasına) */
  tallHeight: number;
  /** Seçiliyken genişleme payı (1 = eşit) */
  grow?: number;
  style?: StyleProp<ViewStyle>;
  onStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
};

export function ExpandChoice({ on, onPress, height, tallHeight, grow = 1.3, style, onStyle, accessibilityLabel, children }: Props) {
  const layout = useRef(new Animated.Value(on ? 1 : 0)).current; // genişlik ve yükseklik (yerleşim)
  const size = useRef(new Animated.Value(on ? 1 : 0.95)).current; // diğerlerinin küçülmesi (ekran kartında)
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion()) { layout.setValue(on ? 1 : 0); size.setValue(on ? 1 : 0.95); return; }
    Animated.spring(layout, { toValue: on ? 1 : 0, ...SMOOTH, useNativeDriver: false }).start();
    Animated.spring(size, { toValue: on ? 1 : 0.95, ...SMOOTH, useNativeDriver: true }).start();
  }, [on, layout, size]);

  const pressTo = (v: number) => { if (!reduceMotion()) Animated.spring(press, { toValue: v, ...PRESS, useNativeDriver: true }).start(); };

  return (
    <Animated.View
      style={{
        flexBasis: 0,
        flexGrow: layout.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }),
        height: layout.interpolate({ inputRange: [0, 1], outputRange: [height, tallHeight] }),
      }}
    >
      <Animated.View style={[x.fill, { transform: [{ scale: Animated.multiply(size, press) }], transformOrigin: 'bottom' }]}>
        <Pressable
          style={[x.fill, style, on && onStyle]}
          onPressIn={() => pressTo(0.96)}
          onPressOut={() => pressTo(1)}
          onPress={() => { if (!on) haptic.tick(); onPress(); }}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          accessibilityLabel={accessibilityLabel}
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const x = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  fill: { flex: 1 },
});
