import { Animated, View, type ViewStyle } from 'react-native';
import { color } from '../lib/theme';

/** Paletten bağımsız marka kumu (palet zemininde de kullanılan ton). */
export const BRAND_SAND = '#E5D7BC';

type Val = Animated.Value | Animated.AnimatedInterpolation<number> | number;
type Parts = { posts?: Val; arms?: Val; track?: Val };

// Geometri 100 birimlik kare üzerinde (assets/brand/icon.png ile aynı).
const STROKE = 11;
const ARM_LEN = Math.hypot(22, 26) + STROKE - 3; // yuvarlak uçlar dahil, bacakların dışına taşmasın
const ARM_DEG = (Math.atan2(26, 22) * 180) / Math.PI;
const WHEELS: [number, number][] = [[26, 2.6], [38, 1.7], [50, 1.7], [62, 1.7], [74, 2.6]];

/**
 * Makinasal logosu: palet (tırtıl) üzerinde duran kalın bir "M".
 * Parçalar isteğe bağlı Animated değerleriyle (0→1) tek tek canlandırılabilir.
 */
export function BrandMark({ size = 32, radius, parts, style }: { size?: number; radius?: number; parts?: Parts; style?: ViewStyle }) {
  const u = size / 100;
  const posts = parts?.posts ?? 1;
  const arms = parts?.arms ?? 1;
  const track = parts?.track ?? 1;
  const ink = color.accentInk;
  const post = (x: number) => (
    <Animated.View
      style={{
        position: 'absolute', left: (x - STROKE / 2) * u, top: (24 - STROKE / 2) * u, width: STROKE * u, height: (42 + STROKE) * u,
        borderRadius: (STROKE / 2) * u, backgroundColor: ink, transformOrigin: 'bottom',
        transform: [{ scaleY: posts as number }],
      }}
    />
  );
  const arm = (mx: number, deg: number) => (
    <Animated.View
      style={{
        position: 'absolute', left: (mx - ARM_LEN / 2) * u, top: (37 - STROKE / 2) * u, width: ARM_LEN * u, height: STROKE * u,
        borderRadius: (STROKE / 2) * u, backgroundColor: ink, opacity: arms as number,
        transform: [{ rotate: `${deg}deg` }, { scale: typeof arms === 'number' ? 1 : (arms as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) as unknown as number }],
      }}
    />
  );
  return (
    <View style={[{ width: size, height: size, borderRadius: radius ?? size * 0.22, backgroundColor: color.accent, overflow: 'hidden' }, style]} accessibilityLabel="Makinasal">
      <Animated.View
        style={{
          position: 'absolute', left: 16.8 * u, top: 70.8 * u, width: 66.4 * u, height: 16.4 * u,
          borderRadius: 8.2 * u, borderWidth: 3.4 * u, borderColor: BRAND_SAND, opacity: track as number,
          transform: [{ translateX: typeof track === 'number' ? 0 : (track as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: [-24 * u, 0] }) as unknown as number }],
        }}
      >
        {WHEELS.map(([cx, r]) => (
          <View key={cx} style={{ position: 'absolute', left: (cx - 16.8 - 3.4 - r) * u, top: (79 - 70.8 - 3.4 - r) * u, width: r * 2 * u, height: r * 2 * u, borderRadius: r * u, backgroundColor: BRAND_SAND }} />
        ))}
      </Animated.View>
      {arm(39, ARM_DEG)}
      {arm(61, -ARM_DEG)}
      {post(28)}
      {post(72)}
    </View>
  );
}
