import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';

/** Sol üstteki geri düğmesi: çerçevesiz, net bir ok. Geçmiş yoksa ana sayfaya döner. */
export function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 6, opacity: pressed ? 0.55 : 1 })}
    >
      <Icon name="arrow-left" size={26} color="#fff" />
    </Pressable>
  );
}
