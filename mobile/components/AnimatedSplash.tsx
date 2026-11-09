import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import { PlainText } from './LText';
import { AnimatedBrandMark } from './BrandMark';
import { color, font } from '../lib/theme';
import { tr } from '../lib/i18n';

/**
 * Açılış animasyonu (yaklaşık 1 sn): logo kutusu belirir, palet soldan gelir, M yükselir,
 * kepçe kolu yukarıdan inip yerine oturur; yazı belirir, ekran yumuşakça açılır.
 * Hareketi azalt açıksa animasyon atlanır.
 */
export function AnimatedSplash() {
  const [done, setDone] = useState(false);
  const tile = useRef(new Animated.Value(0)).current;
  const track = useRef(new Animated.Value(0)).current;
  const m = useRef(new Animated.Value(0)).current;
  const arm = useRef(new Animated.Value(0)).current;
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
          t(track, 260, 60),
          t(m, 280, 140),
          Animated.timing(arm, { toValue: 1, duration: 400, delay: 300, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
          // Yazı logoyla birlikte belirir (en baştan tam renkli görünsün diye beklemeden)
          t(word, 260, 120),
        ]),
        Animated.delay(160),
        Animated.timing(out, { toValue: 1, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => { if (alive) setDone(true); });
    });
    return () => { alive = false; };
  }, [tile, track, m, arm, word, out]);

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
        <AnimatedBrandMark size={120} track={track} m={m} arm={arm} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', marginTop: 22, opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <PlainText style={s.word}>MAKİNA<PlainText style={[s.word, s.wordAccent]}>SAL</PlainText></PlainText>
        <PlainText style={s.tag}>{tr('İş makinesi, parça ve iş pazarı')}</PlainText>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  word: { color: color.ink, fontFamily: font.bold, fontSize: 30, letterSpacing: 3 },
  wordAccent: { color: color.accentText },
  tag: { color: color.ink, fontFamily: font.medium, fontSize: 15, marginTop: 6 },
});
