import { useCallback, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { color } from '../lib/theme';
import * as haptic from '../lib/haptics';
import { setTabAnimator, tabFocused } from '../lib/tabBack';
import { EASE_OUT, SPRING_RELEASE, SPRING_SETTLE, reduceMotion } from '../lib/motion';

/** Alt menü sırası; sağa/sola kaydırınca bir önceki/sonraki sekmeye geçilir. */
export const TAB_ORDER = ['index', 'ilanlar', 'yeni', 'is-agi', 'hesap'] as const;
type Tab = (typeof TAB_ORDER)[number];
const PATH: Record<string, string> = { index: '/', ilanlar: '/ilanlar', yeni: '/yeni', 'is-agi': '/is-agi', hesap: '/hesap' };

/*
 * Sekme geçişi yalnızca kaydırınca canlandırılır (alt menüdeki simgeye dokununca anında geçer):
 *   1) açık olan ekran yavaşça solar ve gidilen yöne doğru hafifçe kayar,
 *   2) yeni ekran karşı yönden hafifçe kayarak belirir.
 * Kaydırırken ekran parmağı izler; yeterince çekilmezse yerine geri döner.
 * Apple hareket kuralları (bkz. lib/motion.ts):
 *   - karar bırakılan noktaya değil, parmağın hızıyla gideceği noktaya göre verilir (kısa ama hızlı fırlatma da geçer),
 *   - ekran bırakıldığı hızla devam eder ya da yerine yayla döner (ani duruş, "duvar" hissi yok),
 *   - ilk/son sekmede kenar sert durmaz, giderek artan dirençle esner.
 * Telefonun "Hareketi azalt" ayarı açıksa geçiş anında yapılır.
 */
const OUT_MS = 160;
const IN_MS = 240;
const SHIFT = 22;
const FOLLOW = 0.35; // ekran parmağın %35'i kadar kayar (yönü gösteren ipucu; arkada boşluk görünmesin)

/** Apple'ın momentum projeksiyonu: parmak bu hızla bırakılırsa nerede durur (px). v: px/ms */
const project = (v: number, rate = 0.995) => (v * rate) / (1 - rate);
/** Kenarda yumuşak direnç: çekildikçe daha az takip eder. */
const rubber = (d: number, dim: number, c = 0.55) => (d * dim * c) / (dim + c * Math.abs(d));

type Screen = { x: Animated.Value; o: Animated.Value };
const screens = new Map<string, Screen>();
let current: string = 'index';
let pendingDir = 0;
let busy = false;
/** Yatay kaydırılan bir şeride dokunulurken sekme kaydırması devre dışı (bkz. NoSwipe). */
let locked = false;

export const currentTab = () => current;

/**
 * İçindeki yatay kaydırma (kategori şeridi, vitrin) sekme kaydırmasından önce gelir: parmak bu alandayken
 * sağa/sola kaydırmak sekme değiştirmez, yalnızca şeridi kaydırır.
 */
export function NoSwipe({ children }: { children: ReactNode }) {
  const off = () => { locked = false; };
  return (
    <View onTouchStart={() => { locked = true; }} onTouchEnd={off} onTouchCancel={off}>
      {children}
    </View>
  );
}

/** Sekmeler arası "geri" düğmesi de kaydırmadaki gibi canlandırılarak geçer. */
export const animateToTab = (next: string) => goTab(next);
setTabAnimator(animateToTab);
const idx = (t: string) => TAB_ORDER.indexOf(t as Tab);

/** Kaydırma ile sekmeye geçer: önce açık ekran solar, sonra yenisi belirir. */
function goTab(next: string, velocity = 0) {
  if (busy || next === current || idx(next) < 0) return;
  const dir = idx(next) > idx(current) ? 1 : -1;
  const from = screens.get(current);
  busy = true;
  pendingDir = dir;
  haptic.tick();
  const finish = () => {
    router.navigate(PATH[next] as never);
    setTimeout(() => { busy = false; }, 60);
  };
  if (!from || reduceMotion()) { finish(); return; }
  // Ekran parmağın bıraktığı hızla gidilen yöne devam eder; solma bitince yeni sekme açılır
  Animated.spring(from.x, { ...SPRING_SETTLE, toValue: -dir * SHIFT * 2, velocity: velocity * 1000 * FOLLOW, overshootClamping: true }).start();
  Animated.timing(from.o, { toValue: 0, duration: OUT_MS, easing: EASE_OUT, useNativeDriver: true }).start(finish);
}

/** Her sekme ekranını sarar. Dikey kaydırma ve yatay fotoğraf / çip listeleri önceliğini korur. */
export function SwipeTabs({ route, children }: { route: string; children: ReactNode }) {
  // İlk kez açılan sekme görünmez başlar (belirme animasyonu öncesi bir an bile parlamasın)
  const entering = pendingDir !== 0 && route !== current && !reduceMotion();
  const x = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(entering ? 0 : 1)).current;
  screens.set(route, { x, o });

  useFocusEffect(
    useCallback(() => {
      // Yalnızca kaydırmayla gelindiyse belirme animasyonu oynar (dokunmada pendingDir = 0)
      const changed = current !== route && pendingDir !== 0;
      const dir = pendingDir;
      current = route;
      tabFocused(route);
      pendingDir = 0;
      if (changed && !reduceMotion()) {
        x.setValue(dir * SHIFT);
        o.setValue(0);
        Animated.timing(o, { toValue: 1, duration: IN_MS, easing: EASE_OUT, useNativeDriver: true }).start();
        Animated.spring(x, { ...SPRING_SETTLE, toValue: 0 }).start();
      } else {
        x.setValue(0);
        o.setValue(1);
      }
      // Ekran arkada kalınca bir sonraki açılış için sıfırla
      return () => { x.stopAnimation(); o.stopAnimation(); x.setValue(0); o.setValue(1); };
    }, [route, x, o]),
  );

  // Yerine dönüş: parmağın son hızını alır, o hız varsa hafifçe esner
  const back = (vx = 0) => {
    Animated.spring(x, { ...(Math.abs(vx) > 0.3 ? SPRING_RELEASE : SPRING_SETTLE), toValue: 0, velocity: vx * 1000 * FOLLOW }).start();
    Animated.timing(o, { toValue: 1, duration: 180, easing: EASE_OUT, useNativeDriver: true }).start();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !busy && !locked && Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
      onPanResponderTerminationRequest: () => true,
      // Yeni dokunuş süren bir geri dönüşü yakalar: hareket ekrandaki o anki yerinden devam eder
      onPanResponderGrant: () => { x.stopAnimation(); o.stopAnimation(); },
      onPanResponderMove: (_, g) => {
        if (reduceMotion()) return;
        const w = Dimensions.get('window').width;
        const i = idx(route);
        const has = g.dx < 0 ? i < TAB_ORDER.length - 1 : i > 0;
        // Gidilecek sekme yoksa (ilk / son) ekran giderek artan dirençle esner
        x.setValue(has ? g.dx * FOLLOW : rubber(g.dx, w) * 0.25);
        o.setValue(has ? 1 - Math.min(Math.abs(g.dx) / w, 1) * 0.75 : 1);
      },
      onPanResponderRelease: (_, g) => {
        const i = idx(route);
        const w = Dimensions.get('window').width;
        // Karar, parmağın hızıyla ulaşacağı noktaya göre: ekranın dörtte birini geçecekse sekme değişir
        const landing = g.dx + project(g.vx);
        const far = Math.abs(landing) > w * 0.25 && Math.sign(landing) === Math.sign(g.dx);
        const next = g.dx < 0 ? TAB_ORDER[i + 1] : TAB_ORDER[i - 1];
        if (far && next && i >= 0 && !busy) goTab(next, g.vx);
        else back(g.vx);
      },
      onPanResponderTerminate: () => back(),
    }),
  ).current;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: color.bg, opacity: o, transform: [{ translateX: x }] }} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}
