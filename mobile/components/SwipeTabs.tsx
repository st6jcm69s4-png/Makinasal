import { useCallback, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, PanResponder } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { color } from '../lib/theme';

/** Alt menü sırası; sağa/sola kaydırınca bir önceki/sonraki sekmeye geçilir. */
export const TAB_ORDER = ['index', 'ilanlar', 'is-agi', 'hesap'] as const;
type Tab = (typeof TAB_ORDER)[number];
const PATH: Record<string, string> = { index: '/', ilanlar: '/ilanlar', 'is-agi': '/is-agi', hesap: '/hesap' };

/*
 * Sekme geçişi yalnızca kaydırınca canlandırılır (alt menüdeki simgeye dokununca anında geçer):
 *   1) açık olan ekran yavaşça solar ve gidilen yöne doğru hafifçe kayar,
 *   2) yeni ekran karşı yönden hafifçe kayarak belirir.
 * Kaydırırken ekran parmağı izler; yeterince çekilmezse yerine geri döner.
 * Telefonun "Hareketi azalt" ayarı açıksa geçiş anında yapılır.
 */
const OUT_MS = 170;
const IN_MS = 250;
const SHIFT = 22;

type Screen = { x: Animated.Value; o: Animated.Value };
const screens = new Map<string, Screen>();
let current: string = 'index';
let pendingDir = 0;
let busy = false;
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion = v; }).catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduceMotion = v; });

export const currentTab = () => current;
const idx = (t: string) => TAB_ORDER.indexOf(t as Tab);

/** Kaydırma ile sekmeye geçer: önce açık ekran solar, sonra yenisi belirir. */
function goTab(next: string) {
  if (busy || next === current || idx(next) < 0) return;
  const dir = idx(next) > idx(current) ? 1 : -1;
  const from = screens.get(current);
  busy = true;
  pendingDir = dir;
  const finish = () => {
    router.navigate(PATH[next] as never);
    setTimeout(() => { busy = false; }, 120);
  };
  if (!from || reduceMotion) { finish(); return; }
  Animated.parallel([
    Animated.timing(from.o, { toValue: 0, duration: OUT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(from.x, { toValue: -dir * SHIFT, duration: OUT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
  ]).start(finish);
}

/** Her sekme ekranını sarar. Dikey kaydırma ve yatay fotoğraf / çip listeleri önceliğini korur. */
export function SwipeTabs({ route, children }: { route: string; children: ReactNode }) {
  // İlk kez açılan sekme görünmez başlar (belirme animasyonu öncesi bir an bile parlamasın)
  const entering = pendingDir !== 0 && route !== current && !reduceMotion;
  const x = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(entering ? 0 : 1)).current;
  screens.set(route, { x, o });

  useFocusEffect(
    useCallback(() => {
      // Yalnızca kaydırmayla gelindiyse belirme animasyonu oynar (dokunmada pendingDir = 0)
      const changed = current !== route && pendingDir !== 0;
      const dir = pendingDir;
      current = route;
      pendingDir = 0;
      if (changed && !reduceMotion) {
        x.setValue(dir * SHIFT);
        o.setValue(0);
        Animated.parallel([
          Animated.timing(o, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      } else {
        x.setValue(0);
        o.setValue(1);
      }
      // Ekran arkada kalınca bir sonraki açılış için sıfırla
      return () => { x.stopAnimation(); o.stopAnimation(); x.setValue(0); o.setValue(1); };
    }, [route, x, o]),
  );

  const back = () => {
    Animated.parallel([
      Animated.spring(x, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !busy && Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (_, g) => {
        if (reduceMotion) return;
        const w = Dimensions.get('window').width;
        const i = idx(route);
        const has = g.dx < 0 ? i < TAB_ORDER.length - 1 : i > 0;
        // Gidilecek sekme yoksa (ilk / son) ekran direnç gösterir
        x.setValue(g.dx * (has ? 0.35 : 0.08));
        o.setValue(has ? 1 - Math.min(Math.abs(g.dx) / w, 1) * 0.75 : 1);
      },
      onPanResponderRelease: (_, g) => {
        const i = idx(route);
        const far = Math.abs(g.dx) > 80 || (Math.abs(g.dx) > 40 && Math.abs(g.vx) > 0.5);
        const next = g.dx < 0 ? TAB_ORDER[i + 1] : TAB_ORDER[i - 1];
        if (far && next && i >= 0 && !busy) goTab(next);
        else back();
      },
      onPanResponderTerminate: back,
    }),
  ).current;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: color.bg, opacity: o, transform: [{ translateX: x }] }} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}
