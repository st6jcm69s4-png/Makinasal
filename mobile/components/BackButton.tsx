import { Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { tr } from '../lib/i18n';
import { color } from '../lib/theme';

// iOS 26 ve sonrası başlık düğmelerini kendi cam zemininin içine alır; orada ayrıca daire çizilmez.
const systemGlass = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

/**
 * Sol üstteki geri düğmesi: tüm iç sayfalarda aynı görünür.
 * - Geri gidilecek sayfa varsa ok (‹), yoksa (bildirimden ya da bağlantıdan açıldıysa) ana sayfa simgesi.
 * - 44 pt dokunma alanı; iPhone 26'da sistem camı, diğerlerinde yumuşak yuvarlak zemin.
 * Kenardan kaydırarak geri gitme (iPhone) ve Android geri tuşu aynen çalışır.
 */
export function BackButton({ canGoBack, onPress }: { canGoBack: boolean; onPress?: () => void }) {
  const go = onPress ?? (() => (canGoBack ? router.back() : router.replace('/')));
  return (
    <Pressable
      onPress={go}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={tr(canGoBack ? 'Geri' : 'Ana sayfa')}
      style={({ pressed }) => [{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: systemGlass ? 0 : -6 }, pressed && { opacity: 0.55 }]}
    >
      <View style={systemGlass ? null : { width: 38, height: 38, borderRadius: 19, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: color.line }}>
        <View style={canGoBack ? { marginRight: 2 } : null}>
          <Icon name={canGoBack ? 'chevron-left' : 'home'} size={canGoBack ? 25 : 19} color={color.ink} />
        </View>
      </View>
    </Pressable>
  );
}
