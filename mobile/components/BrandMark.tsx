import { Animated, Image, View, type ImageSourcePropType, type ImageStyle } from 'react-native';

/** Marka renkleri (uygulama paletinden bağımsız): iş makinesi sarısı ve kömür. */
export const BRAND_YELLOW = '#F5B700';
export const BRAND_INK = '#1F1F1C';

/* eslint-disable @typescript-eslint/no-require-imports */
const FULL = require('../assets/brand/splash-icon.png') as ImageSourcePropType;
const LAYERS = {
  excavator: require('../assets/brand/l-excavator.png') as ImageSourcePropType,
  arm: require('../assets/brand/l-arm.png') as ImageSourcePropType,
  load: require('../assets/brand/l-load.png') as ImageSourcePropType,
  truck: require('../assets/brand/l-truck.png') as ImageSourcePropType,
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Makinasal logosu: kamyona yük boşaltan ekskavatör (sarı zemin, kömür çizim). */
export function BrandMark({ size = 32, style }: { size?: number; style?: ImageStyle }) {
  return <Image source={FULL} style={[{ width: size, height: size }, style]} accessibilityLabel="Makinasal" />;
}

type V = Animated.Value;
/**
 * Katmanlı logo (açılış animasyonu için). Değerler 0→1:
 * dig: ekskavatör belirir, truck: kamyon sağdan gelir, arm: kol iner, load: yük dökülür.
 */
export function AnimatedBrandMark({ size, dig, truck, arm, load }: { size: number; dig: V; truck: V; arm: V; load: V }) {
  const u = size / 100;
  const layer = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  const rise = dig.interpolate({ inputRange: [0, 1], outputRange: [8 * u, 0] });
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: BRAND_YELLOW, overflow: 'hidden' }} accessibilityLabel="Makinasal">
      <Animated.Image
        source={LAYERS.truck}
        style={[layer, { transform: [{ translateX: truck.interpolate({ inputRange: [0, 1], outputRange: [62 * u, 0] }) }] }]}
      />
      <Animated.Image
        source={LAYERS.load}
        style={[layer, { opacity: load, transform: [{ translateY: load.interpolate({ inputRange: [0, 1], outputRange: [-5 * u, 0] }) }] }]}
      />
      <Animated.Image source={LAYERS.excavator} style={[layer, { opacity: dig, transform: [{ translateY: rise }] }]} />
      {/* Kol omuz pimi (30,62) etrafında döner: önce yukarıda, sonra kamyonun üstüne iner. */}
      <Animated.Image
        source={LAYERS.arm}
        style={[layer, {
          opacity: dig,
          transformOrigin: '30% 62%',
          transform: [
            { translateY: rise },
            { rotate: arm.interpolate({ inputRange: [0, 1], outputRange: ['-38deg', '0deg'] }) },
          ],
        }]}
      />
    </View>
  );
}
