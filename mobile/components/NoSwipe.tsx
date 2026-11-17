import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/*
 * İçindeki yatay kaydırma (kategori şeridi, bölüm sekmeleri, filtre çipleri) sekmeler arası kaydırmadan önce gelir:
 * parmak bu alandayken sağa/sola kaydırmak sekme değiştirmez, yalnızca şeridi kaydırır (bkz. SwipeTabs).
 */
let locked = false;
export const swipeLocked = () => locked;

export function NoSwipe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const off = () => { locked = false; };
  return (
    <View style={style} onTouchStart={() => { locked = true; }} onTouchEnd={off} onTouchCancel={off}>
      {children}
    </View>
  );
}
