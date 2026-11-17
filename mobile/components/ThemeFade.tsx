import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { palettes } from '../lib/theme';
import { useScheme } from '../lib/nav';
import { setThemeFader } from '../lib/themePref';
import { reduceMotion } from '../lib/motion';

/*
 * Açık ↔ koyu geçişinde tüm ekranı (başlık çubuğu ve sekme çubuğu dahil) tek parça döndürür:
 * 1) ekran 140 ms'de eski zemin rengiyle örtülür,
 * 2) görünüm perdenin arkasında değişir (başlık çubuğu, sayfalar, sekmeler),
 * 3) her şey yeni rengini aldıktan sonra perde 280 ms'de açılır.
 * Dokunmayı engellemez; kök düzende en üstte durur.
 */
export function ThemeFade() {
  const scheme = useScheme();
  const now = useRef(scheme);
  now.current = scheme;
  const [bg, setBg] = useState<string>(palettes[scheme].bg);
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setThemeFader((swap) => {
      const still = reduceMotion();
      setBg(palettes[now.current].bg);
      a.stopAnimation();
      Animated.timing(a, { toValue: 1, duration: still ? 0 : 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        swap();
        // Telefonun başlık çubuğu yeni rengi birkaç kare sonra alıyor; perde o sürede kapalı kalır
        setTimeout(() => {
          Animated.timing(a, { toValue: 0, duration: still ? 120 : 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
        }, 220);
      });
    });
    return () => setThemeFader(null);
  }, [a]);

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { backgroundColor: bg, opacity: a, zIndex: 9999, elevation: 9999 }]}
    />
  );
}
