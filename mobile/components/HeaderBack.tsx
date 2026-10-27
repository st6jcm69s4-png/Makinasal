import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';

/** Yalnızca geçmiş yokken (bağlantıyla açılan sayfa) görünür: ana sayfaya götürür. Normalde sistemin kendi geri oku kullanılır. */
export function HeaderBack() {
  return (
    <Pressable onPress={() => router.replace('/')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Ana sayfa" style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
      <Icon name="home" size={22} color="#fff" />
    </Pressable>
  );
}
