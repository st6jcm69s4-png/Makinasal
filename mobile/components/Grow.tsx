import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { reduceMotion } from '../lib/motion';
import * as haptic from '../lib/haptics';

/*
 * Seçilen düğme büyür ve yukarı doğru hafifçe yükselir (alt kenarı yerinde kalır).
 * - Hareket yayla (spring): yumuşak başlar, zıplamadan yerine oturur; araya girilebilir
 *   (kullanıcı başka düğmeye geçerse animasyon kesilip yeni hedefe döner).
 * - Basılıyken hafifçe küçülür (dokunmanın karşılığı), bırakınca geri gelir.
 * - Seçim değişince iPhone'da hafif bir "tık" titreşimi.
 * - "Hareketi azalt" açıksa büyüme ve yükselme kapalı.
 * Yalnızca dönüşüm (transform) kullanır: telefonun ekran kartında çalışır, yerleşim kaymaz.
 */
const GROW = 1.08;
const LIFT = -3;
const SELECT_SPRING = { stiffness: 170, damping: 25, mass: 1, useNativeDriver: true } as const; // zıplamasız, yumuşak
const PRESS_SPRING = { stiffness: 500, damping: 34, mass: 1, useNativeDriver: true } as const;

export function useGrow(on: boolean) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion()) { v.setValue(on ? 1 : 0); return; }
    Animated.spring(v, { toValue: on ? 1 : 0, ...SELECT_SPRING }).start();
  }, [on, v]);
  return v;
}

type Props = Omit<PressableProps, 'style' | 'children'> & {
  on: boolean;
  style?: StyleProp<ViewStyle>;
  /** Dış kap (boşluk / esneme için) */
  wrapStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Ne kadar büyüsün (varsayılan %8) */
  grow?: number;
};

export function GrowPressable({ on, style, wrapStyle, children, grow = GROW, onPress, onPressIn, onPressOut, ...rest }: Props) {
  const sel = useGrow(on);
  const press = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(sel.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }), press);
  const translateY = sel.interpolate({ inputRange: [0, 1], outputRange: [0, LIFT] });
  const to = (x: number) => { if (!reduceMotion()) Animated.spring(press, { toValue: x, ...PRESS_SPRING }).start(); };
  return (
    <Animated.View style={[wrapStyle, on && g.front, { transform: [{ translateY }, { scale }], transformOrigin: 'bottom' }]}>
      <Pressable
        {...rest}
        style={style}
        onPressIn={(e) => { to(0.96); onPressIn?.(e); }}
        onPressOut={(e) => { to(1); onPressOut?.(e); }}
        onPress={(e) => { if (!on) haptic.tick(); onPress?.(e); }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const g = StyleSheet.create({ front: { zIndex: 2 } });
