import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { color, radius } from '../lib/theme';

/** Sol üstteki geri düğmesi: lacivert üstünde çizgili kare, basınca bordo. Geçmiş yoksa ana sayfaya döner. */
export function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={({ pressed }) => ({
        width: 40, height: 40, marginLeft: 4, marginRight: 6, borderRadius: radius,
        borderWidth: 1, borderColor: pressed ? color.accent : '#4A4C54',
        backgroundColor: pressed ? color.accent : color.navy2,
        alignItems: 'center', justifyContent: 'center',
      })}
    >
      <Icon name="arrow-left" size={21} color="#fff" />
    </Pressable>
  );
}
