import { Animated, Image, View, type ImageSourcePropType, type ImageStyle } from 'react-native';

/** Marka renkleri (uygulama paletinden bağımsız): kömür zemin, açık yeşil detay. */
export const BRAND_INK = '#1F201C';
export const BRAND_TEAL = '#3FC2AE';

/* eslint-disable @typescript-eslint/no-require-imports */
const FULL = require('../assets/brand/splash-icon.png') as ImageSourcePropType;
const L = {
  bg: require('../assets/brand/l-bg.png') as ImageSourcePropType,
  track: require('../assets/brand/l-track.png') as ImageSourcePropType,
  m: require('../assets/brand/l-m.png') as ImageSourcePropType,
  arm: require('../assets/brand/l-arm.png') as ImageSourcePropType,
  pin: require('../assets/brand/l-pin.png') as ImageSourcePropType,
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Makinasal logosu: M harfi bir ekskavatör kolu (solda palet, sağda kepçe). */
export function BrandMark({ size = 32, style }: { size?: number; style?: ImageStyle }) {
  return <Image source={FULL} style={[{ width: size, height: size }, style]} accessibilityLabel="Makinasal" />;
}

type V = Animated.Value;
/**
 * Katmanlı logo (açılış animasyonu). Değerler 0→1:
 * track: palet soldan gelir, m: M yükselir, arm: kepçe kolu yukarıdan iner.
 */
export function AnimatedBrandMark({ size, track, m, arm }: { size: number; track: V; m: V; arm: V }) {
  const u = size / 100;
  const layer = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }} accessibilityLabel="Makinasal">
      <Image source={L.bg} style={layer} />
      <Animated.Image
        source={L.track}
        style={[layer, { opacity: track, transform: [{ translateX: track.interpolate({ inputRange: [0, 1], outputRange: [-14 * u, 0] }) }] }]}
      />
      <Animated.Image
        source={L.m}
        style={[layer, { opacity: m, transform: [{ translateY: m.interpolate({ inputRange: [0, 1], outputRange: [10 * u, 0] }) }] }]}
      />
      {/* Kepçe kolu dirsek pimi (68,25) etrafında döner: önce yukarıda, sonra yerine iner. */}
      <Animated.Image
        source={L.arm}
        style={[layer, {
          opacity: arm.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
          transformOrigin: '68% 25%',
          transform: [{ rotate: arm.interpolate({ inputRange: [0, 1], outputRange: ['-75deg', '0deg'] }) }],
        }]}
      />
      <Animated.Image source={L.pin} style={[layer, { opacity: m, transform: [{ translateY: m.interpolate({ inputRange: [0, 1], outputRange: [10 * u, 0] }) }] }]} />
    </View>
  );
}
