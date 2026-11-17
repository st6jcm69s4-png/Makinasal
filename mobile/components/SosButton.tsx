import { Platform, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Icon } from './Icon';
import { PlainText } from './LText';
import { tr } from '../lib/i18n';
import { color, font } from '../lib/theme';
import { useHeaderColor } from '../lib/nav';

/*
 * Sağ üstte kırmızı "112" düğmesi (Çekici bul). Her zaman görünür ama içerikte yer kaplamaz.
 * iPhone: başlık çubuğunun kendi düğmesi (iOS 26'da cam), Android: kırmızı küçük kapsül.
 * Basınca doğrudan aramaz; ekran önce sorar (call112).
 */
export function SosButton({ onPress }: { onPress: () => void }) {
  const red = useHeaderColor('bad');
  if (Platform.OS === 'ios') {
    return (
      <Stack.Screen
        options={{
          unstable_headerRightItems: () => [{
            type: 'button', label: '112', icon: { type: 'sfSymbol', name: 'phone.fill' as never }, tintColor: red, onPress,
          }],
        }}
      />
    );
  }
  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr("112'yi ara")} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: color.badBg }, pressed && { opacity: 0.6 }]}>
            <Icon name="phone" size={14} color={color.bad} />
            <PlainText style={{ color: color.bad, fontFamily: font.bold, fontSize: 15 }}>112</PlainText>
          </Pressable>
        ),
      }}
    />
  );
}
