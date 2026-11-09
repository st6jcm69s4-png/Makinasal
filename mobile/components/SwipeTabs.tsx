import { useRef, type ReactNode } from 'react';
import { PanResponder, View } from 'react-native';
import { router } from 'expo-router';

/** Alt menü sırası; sağa/sola kaydırınca bir önceki/sonraki sekmeye geçilir. */
export const TAB_ORDER = ['index', 'ilanlar', 'is-agi', 'favoriler', 'mesajlar', 'hesap'] as const;
const PATH: Record<string, string> = { index: '/', ilanlar: '/ilanlar', 'is-agi': '/is-agi', favoriler: '/favoriler', mesajlar: '/mesajlar', hesap: '/hesap' };

/**
 * Her sekme ekranını sarar. Yalnızca belirgin yatay kaydırmada devreye girer
 * (dikey kaydırma ve yatay fotoğraf/çip listeleri önceliğini korur).
 */
export function SwipeTabs({ route, children }: { route: string; children: ReactNode }) {
  const busy = useRef(false);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        if (busy.current) return;
        const far = Math.abs(g.dx) > 80 || (Math.abs(g.dx) > 40 && Math.abs(g.vx) > 0.5);
        if (!far) return;
        const i = TAB_ORDER.indexOf(route as (typeof TAB_ORDER)[number]);
        if (i < 0) return;
        const next = g.dx < 0 ? TAB_ORDER[i + 1] : TAB_ORDER[i - 1];
        if (!next) return;
        busy.current = true;
        router.navigate(PATH[next] as never);
        setTimeout(() => { busy.current = false; }, 400);
      },
    }),
  ).current;
  return <View style={{ flex: 1 }} {...pan.panHandlers}>{children}</View>;
}
