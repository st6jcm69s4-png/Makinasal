import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, type IconName } from './Icon';
import { PlainText } from './LText';
import { useApp } from '../lib/AppContext';
import { useUnread } from '../lib/unread';
import { tr } from '../lib/i18n';
import { color, font } from '../lib/theme';

/** Başlıktaki tek simge düğmesi (44 pt dokunma alanı, isteğe bağlı sayı rozeti). */
function Btn({ icon, label, badge, onPress, tint }: { icon: IconName; label: string; badge?: number; onPress: () => void; tint: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge}` : label} style={({ pressed }) => [{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.5 }]}>
      <Icon name={icon} size={21} color={tint} />
      {badge ? (
        <View style={{ position: 'absolute', top: 5, right: 1, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: color.bad, alignItems: 'center', justifyContent: 'center' }}>
          <PlainText style={{ color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontFamily: font.textBold }}>{badge > 99 ? '99+' : String(badge)}</PlainText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Sekme başlıklarının sağındaki üç düğme: arama, bildirimler, mesajlar (okunmamış sayısıyla).
 * iOS 26'da sistem bunları kendi cam zemininin içine alır; ayrı bir hap çizilmez.
 */
export function HeaderButtons({ tint = color.ink }: { tint?: string }) {
  const { session } = useApp();
  const unread = useUnread();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Btn tint={tint} icon="search" label={tr('Uygulamada ara')} onPress={() => router.push('/ara' as never)} />
      <Btn tint={tint} icon="bell" label={tr('Bildirimler')} onPress={() => router.push(session ? '/bildirimler' as never : '/hesap' as never)} />
      <Btn tint={tint} icon="message-square" label={tr('Mesajlar')} badge={unread} onPress={() => router.push('/mesajlar' as never)} />
    </View>
  );
}
