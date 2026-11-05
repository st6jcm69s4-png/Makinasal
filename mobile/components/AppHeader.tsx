import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PlainText } from './LText';
import { Icon } from './Icon';
import { tr } from '../lib/i18n';
import { color, font, fontState } from '../lib/theme';

/**
 * İç sayfaların başlık çubuğu. Telefonun yerel başlığı yerine bunu kullanıyoruz:
 * renkleri sayfanın geri kalanıyla aynı anda değişir (tema geçişinde gecikme olmaz).
 */
export function AppHeader({ title, canGoBack, onBack }: { title: string; canGoBack: boolean; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top }]}>
      <View style={s.row}>
        <View style={s.side}>
          {canGoBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Geri')} style={s.btn}>
              <Icon name="chevron-left" size={28} color={color.onBar} />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.replace('/')} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Ana sayfa')} style={s.btn}>
              <Icon name="home" size={22} color={color.onBar} />
            </Pressable>
          )}
        </View>
        <PlainText style={[s.title, fontState.ok && { fontFamily: font.bold }]} numberOfLines={1} accessibilityRole="header">{title}</PlainText>
        <View style={s.side} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: color.navy },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  side: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: color.onBar, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
