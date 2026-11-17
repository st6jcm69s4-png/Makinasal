import { View } from 'react-native';
import { Host } from '@expo/ui';
import { Button, Divider, Image, Menu } from '@expo/ui/swift-ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { tr } from '../lib/i18n';
import { color } from '../lib/theme';
import type { MenuItem } from './MoreMenu';

export type { MenuItem } from './MoreMenu';

/*
 * "Daha fazla" (…) menüsü, iPhone: sistemin kendi açılır menüsü (SwiftUI Menu / UIMenu).
 * Düğmenin yanında küçük bir liste olarak açılır, ekranı kaplamaz, cam görünümlüdür (iOS 26).
 * Tehlikeli seçenek (Kaldır) kırmızı ve bir çizgiyle ayrılmış en altta.
 */
export function MoreMenu({ items, label = 'İlan seçenekleri' }: { items: MenuItem[]; label?: string }) {
  const safe = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={tr(label)}>
      {/* Daire zemin: düğmenin görünür kısmı; dokunma alanı 44 pt */}
      <View pointerEvents="none" style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: color.plate }} />
      <Host matchContents>
        <Menu label={<Image systemName={'ellipsis' as never} size={16} color={color.accentText} modifiers={[frame({ width: 44, height: 44 })]} />}>
          {safe.map((it) => <Button key={it.label} label={tr(it.label)} systemImage={it.sf as never} onPress={() => setTimeout(it.run, 300)} />)}
          {/* Menü kapanırken yeni pencere (onay, açık artırma) açılabilsin diye işlem kısa bir gecikmeyle çalışır */}
          {danger.length ? <Divider /> : null}
          {danger.map((it) => <Button key={it.label} label={tr(it.label)} systemImage={it.sf as never} role="destructive" onPress={() => setTimeout(it.run, 300)} />)}
        </Menu>
      </Host>
    </View>
  );
}
