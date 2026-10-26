import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

/** Sol üstteki geri düğmesi; geçmiş yoksa ana sayfaya döner. */
export function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      <Text style={{ color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '600' }}>‹</Text>
    </Pressable>
  );
}
