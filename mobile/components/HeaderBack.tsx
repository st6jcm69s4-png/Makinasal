import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { color } from '../lib/theme';

/** Sol üstteki geri düğmesi: yumuşak yarı saydam daire, basınca bordo. Geçmiş yoksa ana sayfaya döner. */
export function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={({ pressed }) => ({
        width: 36, height: 36, borderRadius: 18, marginLeft: 6, marginRight: 4,
        backgroundColor: pressed ? color.accent : 'rgba(255,255,255,0.14)',
        alignItems: 'center', justifyContent: 'center',
      })}
    >
      <Icon name="chevron-left" size={24} color="#fff" />
    </Pressable>
  );
}
