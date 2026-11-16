import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/*
 * Uygulamanın hareket kuralları (Apple "Designing Fluid Interfaces" + Emil Kowalski, bkz. .claude/skills/animate-expo):
 * - Parmağın tuttuğu ya da fırlattığı her şey yayla (spring) hareket eder ve bırakıldığı hızı korur.
 * - Parmak olmayan geçişler ease-out; arayüzde ease-in yok (hareket geç başlar, gecikmiş hissettirir).
 * - Süreler 300 ms'nin altında; sık yapılan işler (sekme, kaydırma) canlandırılmaz.
 * - "Hareketi azalt" açıksa kayma ve zıplama kalkar, yalnızca kısa solma kalır.
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** Core Animated yay ayarları. Apple'ın "sönüm oranı / tepki süresi" değerlerine karşılık gelir. */
// Sönümlü, zıplamasız yerleşme (damping 1.0, response ≈ 0.35 s)
export const SPRING_SETTLE = { stiffness: 320, damping: 36, mass: 1, useNativeDriver: true } as const;
// Bırakılan sürüklemenin yerine dönmesi: hafif zıplama yalnızca parmak hız taşıdığında (damping ≈ 0.8)
export const SPRING_RELEASE = { stiffness: 300, damping: 28, mass: 1, useNativeDriver: true } as const;

let reduced = false;
const subs = new Set<(v: boolean) => void>();
void AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduced = v; subs.forEach((f) => f(v)); }).catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduced = v; subs.forEach((f) => f(v)); });

/** Telefonun "Hareketi azalt" ayarı (anlık). */
export const reduceMotion = () => reduced;

/** Aynı ayarın React kancası; ayar değişince bileşeni yeniler. */
export function useReducedMotion(): boolean {
  const [v, setV] = useState(reduced);
  useEffect(() => { subs.add(setV); setV(reduced); return () => { subs.delete(setV); }; }, []);
  return v;
}
