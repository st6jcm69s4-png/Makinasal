import { Stack } from 'expo-router';
import { HeaderButtons } from './HeaderButtons';
import { headerOptions, largeTitle } from '../lib/nav';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

/**
 * Bir sekmenin başlık yığını: telefonun kendi başlığı, büyük başlık ve sağda arama / bildirim / mesaj.
 * Sekmeden açılan diğer sayfalar ana yığında açılır (sekme çubuğu gizlenir).
 */
export function TabStack({ title, buttons = true }: { title: string; buttons?: boolean }) {
  useLang();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: tr(title), ...largeTitle, ...(buttons ? { headerRight: () => <HeaderButtons /> } : {}) }} />
    </Stack>
  );
}
