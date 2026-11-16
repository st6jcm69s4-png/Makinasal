import { Stack } from 'expo-router';
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
export function TabStack({ title, buttons = true, large = true }: { title: string; buttons?: boolean; large?: boolean }) {
  useLang();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: tr(title), ...(large ? largeTitle : {}), ...(buttons ? { headerRight: () => <HeaderButtons /> } : {}) }} />
    </Stack>
  );
}
