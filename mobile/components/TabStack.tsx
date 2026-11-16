import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from './LText';
import { fireScrollTop } from '../lib/scrollTop';
import { color, font } from '../lib/theme';
import { HeaderButtons } from './HeaderButtons';
import { headerOptions, largeTitle } from '../lib/nav';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

/**
 * Bir sekmenin başlık yığını: telefonun kendi başlığı, büyük başlık ve sağda arama / bildirim / mesaj.
 * Sekmeden açılan diğer sayfalar ana yığında açılır (sekme çubuğu gizlenir).
 * Büyük başlık yalnızca ilk öğesi sade bir kaydırma listesi olan ekranlarda açılır: arama kutusu ya da
 * bölüm seçici taşıyan ekranlarda (İlanlar, İş Ağı) içerik başlığın altında kalıyor ve liste yüklenirken kayıyor.
 */
export function TabStack({ name, title, buttons = true, large = true }: { name: string; title: string; buttons?: boolean; large?: boolean }) {
  useLang();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{
        title: tr(title), ...(large ? largeTitle : {}),
        // Başlığa dokununca sayfa en üste çıkar (iPhone'da üstteki saate dokunmak da aynısını yapar)
        headerTitle: ({ children }) => (
          <Pressable onPress={() => fireScrollTop(name)} hitSlop={10} accessibilityRole="button" accessibilityHint={tr('En üste çık')}>
            <Text style={{ color: color.ink, fontFamily: font.semi, fontSize: 17 }} numberOfLines={1}>{children}</Text>
          </Pressable>
        ),
        ...(buttons ? { headerRight: () => <HeaderButtons /> } : {}) }} />
    </Stack>
  );
}
