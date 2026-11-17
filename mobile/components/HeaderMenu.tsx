import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MoreMenu, type MenuItem } from './MoreMenu';
import { tr } from '../lib/i18n';

export type HeaderMenuItem = MenuItem & { sub?: { label: string; run: () => void }[] };

/*
 * Sayfanın sağ üstündeki "…" menüsü (paylaş, şikayet et, engelle gibi ikincil işlemler).
 * iPhone: başlık çubuğunun kendi menüsü (UIMenu; iOS 26'da cam düğme). Alt seçenekleri olan madde
 * (ör. şikayet nedenleri) yana açılan alt menü olur. Tehlikeli madde kırmızı ve en altta ayrı.
 * Android: İlanlarım'daki gibi düğmenin altından açılan küçük kart; alt seçenekli madde kendi işlemini
 * çalıştırır (ör. neden seçme penceresi).
 * Kullanım: ekranın içinde <HeaderMenu items={...} /> (başlık seçeneklerini ayarlar, ekranda yer kaplamaz).
 */
export function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  if (Platform.OS !== 'ios') {
    return <Stack.Screen options={{ headerRight: () => <MoreMenu items={items} label="Seçenekler" /> }} />;
  }
  const action = (it: HeaderMenuItem) => it.sub
    ? { type: 'submenu' as const, label: tr(it.label), icon: { type: 'sfSymbol' as const, name: it.sf as never }, destructive: it.danger, items: it.sub.map((x) => ({ type: 'action' as const, label: tr(x.label), destructive: it.danger, onPress: x.run })) }
    : { type: 'action' as const, label: tr(it.label), icon: { type: 'sfSymbol' as const, name: it.sf as never }, destructive: it.danger, onPress: it.run };
  const safe = items.filter((i) => !i.danger).map(action);
  const danger = items.filter((i) => i.danger).map(action);
  const menuItems = danger.length
    ? [...safe, { type: 'submenu' as const, label: '', inline: true, items: danger }]
    : safe;
  return (
    <Stack.Screen
      options={{
        unstable_headerRightItems: () => [{
          type: 'menu',
          label: tr('Seçenekler'),
          icon: { type: 'sfSymbol', name: 'ellipsis' as never },
          menu: { items: menuItems as never },
        }],
      }}
    />
  );
}
