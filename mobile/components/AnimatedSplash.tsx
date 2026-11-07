import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import { PlainText } from './LText';
import { BrandMark } from './BrandMark';
import { color, font } from '../lib/theme';
import { tr } from '../lib/i18n';

/**
 * Açılış animasyonu (yaklaşık 1,6 sn): logo kutusu belirir, palet kayarak gelir,
 * M'nin bacakları yükselir, kolları birleşir; yazı belirir ve ekran yumuşakça açılır.
 * Hareketi azalt açıksa animasyon atlanır.
 */
export function AnimatedSplash() {
  const [done, setDone] = useState(false);
  const tile = useRef(new Animated.Value(0)).current;
  const track = useRef(new Animated.Value(0)).current;
  const posts = useRef(new Animated.Value(0)).current;
  const arms = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    const ease = Easing.out(Easing.cubic);
    const t = (v: Animated.Value, duration: number, delay = 0) => Animated.timing(v, { toValue: 1, duration, delay, easing: ease, useNativeDriver: true });
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive) return;
      if (reduce) { setDone(true); return; }
      Animated.sequence([
        Animated.parallel([
          Animated.spring(tile, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
          t(track, 380, 120),
          t(posts, 340, 260),
          t(arms, 300, 480),
          t(word, 360, 560),
        ]),
        Animated.delay(320),
        Animated.timing(out, { toValue: 1, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => { if (alive) setDone(true); });
    });
    return () => { alive = false; };
  }, [tile, track, posts, arms, word, out]);

  if (done) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, s.screen, { opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
    >
      <Animated.View
        style={{
          opacity: tile,
          transform: [
            { scale: tile.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
            { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        }}
      >
        <BrandMark size={112} radius={26} parts={{ track, posts, arms }} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', marginTop: 22, opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <PlainText style={s.word}>MAKİNASAL</PlainText>
        <PlainText style={s.tag}>{tr('İş makinesi, araç ve parça pazarı')}</PlainText>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  word: { color: color.ink, fontFamily: font.bold, fontSize: 26, letterSpacing: 3 },
  tag: { color: color.muted, fontFamily: font.medium, fontSize: 14, marginTop: 6 },
});
