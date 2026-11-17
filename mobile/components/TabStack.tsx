import { Platform, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from './LText';
import { fireScrollTop } from '../lib/scrollTop';
import { color, font } from '../lib/theme';
import { HeaderButtons } from './HeaderButtons';
import { BackButton } from './BackButton';
import { goBackTab, useTabBack } from '../lib/tabBack';
import { largeTitle, useHeaderOptions } from '../lib/nav';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

/**
 * Bir sekmenin başlık yığını: telefonun kendi başlığı, büyük başlık ve sağda arama / bildirim / mesaj.
 * Sekmeden açılan diğer sayfalar ana yığında açılır (sekme çubuğu gizlenir).
 * Büyük başlık yalnızca ilk öğesi sade bir kaydırma listesi olan ekranlarda açılır: arama kutusu ya da
 * bölüm seçici taşıyan ekranlarda (İlanlar, İş Ağı) içerik başlığın altında kalıyor ve liste yüklenirken kayıyor.
 */
/** Başka bir sekmeden bağlantıyla gelindiyse oraya dönen geri düğmesi. */
function TabBack({ name }: { name: string }) {
  const to = useTabBack(name);
  return to ? <BackButton canGoBack onPress={() => goBackTab(name)} /> : null;
}

export function TabStack({ name, title, buttons = true, large = true }: { name: string; title: string; buttons?: boolean; large?: boolean }) {
  useLang();
  const back = useTabBack(name);
  const headerOptions = useHeaderOptions();
  /*
   * Başka sekmeden bağlantıyla gelindiyse sol üstte geri düğmesi.
   * iPhone: telefonun kendi başlık düğmesi (SF Symbols oku, iOS 26'da cam daire). Android: kendi düğmemiz.
   */
  const left = Platform.OS === 'ios'
    ? { unstable_headerLeftItems: () => (back ? [{ type: 'button' as const, label: tr('Geri'), icon: { type: 'sfSymbol' as const, name: 'chevron.left' as const }, onPress: () => goBackTab(name) }] : []) }
    : { headerLeft: () => <TabBack name={name} /> };
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{
        title: tr(title), ...(large ? largeTitle : {}),
        ...left,
        // Başlığa dokununca sayfa en üste çıkar (iPhone'da üstteki saate dokunmak da aynısını yapar).
        // iPhone'da büyük başlıklı sekmelerde telefonun kendi başlığı kalır: bizim kaydırmamız sayfayı başlığın altına götürüyordu.
        ...(Platform.OS === 'ios' && large ? {} : { headerTitle: ({ children }: { children: string }) => (
          <Pressable onPress={() => fireScrollTop(name)} hitSlop={10} accessibilityRole="button" accessibilityHint={tr('En üste çık')}>
            <Text style={{ color: color.ink, fontFamily: font.semi, fontSize: 17 }} numberOfLines={1}>{children}</Text>
          </Pressable>
        ) }),
        ...(buttons ? { headerRight: () => <HeaderButtons /> } : {}) }} />
    </Stack>
  );
}
