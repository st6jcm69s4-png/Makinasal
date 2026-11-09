import { useRef, type ReactNode } from 'react';
import { Keyboard, View, type GestureResponderEvent } from 'react-native';
import { router, usePathname } from 'expo-router';

/**
 * Hangi sayfada olunursa olsun ekrana art arda iki kez dokununca arama ekranı açılır.
 * Yalnızca boş alanlarda çalışır: düğme, kart, yazı alanı gibi dokunuşu kendisi karşılayan bir öğeye
 * dokunulduysa sayılmaz. (React Native dokunuşu önce en içteki öğeye sorar; hiçbiri sahiplenmezse
 * bu sarmalayıcıya ulaşır. Sarmalayıcı yalnızca "boş alan" diye not alır, dokunuşu hiç sahiplenmez;
 * böylece kaydırma ve sekme kaydırması etkilenmez.)
 * Açılmadığı durumlar: zaten arama ekranındayken, klavye açıkken (yazı seçimi),
 * parmak kaydırıldıysa, ilk dokunuş başka sayfaya geçirdiyse, iki dokunuş birbirinden uzaksa.
 */
const TAP_MS = 250; // tek dokunuşun en uzun süresi
const GAP_MS = 300; // iki dokunuş arası en uzun süre
const MOVE = 10; // dokunuş sayılması için en fazla kayma (pt)
const NEAR = 40; // iki dokunuşun birbirine en uzak mesafesi (pt)

export function DoubleTapSearch({ children }: { children: ReactNode }) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const last = useRef<{ x: number; y: number; t: number; path: string } | null>(null);
  // Bu dokunuşu hiçbir öğe sahiplenmediyse zamanı (boş alana dokunuldu)
  const emptyAt = useRef<number | null>(null);

  const onStart = (e: GestureResponderEvent) => {
    const n = e.nativeEvent;
    start.current = n.touches.length > 1 ? null : { x: n.pageX, y: n.pageY, t: Date.now() };
  };
  const onEnd = (e: GestureResponderEvent) => {
    const s = start.current;
    const empty = emptyAt.current;
    start.current = null;
    emptyAt.current = null;
    if (!s) return;
    if (empty === null || Math.abs(empty - s.t) > 150) { last.current = null; return; }
    const n = e.nativeEvent;
    const now = Date.now();
    if (now - s.t > TAP_MS || Math.abs(n.pageX - s.x) > MOVE || Math.abs(n.pageY - s.y) > MOVE) { last.current = null; return; }
    const p = last.current;
    if (p && now - p.t < GAP_MS && Math.hypot(n.pageX - p.x, n.pageY - p.y) < NEAR && p.path === pathRef.current) {
      last.current = null;
      if (pathRef.current !== '/ara' && !Keyboard.isVisible()) router.push('/ara' as never);
      return;
    }
    last.current = { x: n.pageX, y: n.pageY, t: now, path: pathRef.current };
  };

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => { emptyAt.current = Date.now(); return false; }}
      onTouchStart={onStart} onTouchEnd={onEnd} onTouchCancel={() => { start.current = null; }}>
      {children}
    </View>
  );
}
