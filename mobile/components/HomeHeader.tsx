import { Pressable, View } from 'react-native';
import { fireScrollTop } from '../lib/scrollTop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlainText } from './LText';
import { BrandMark } from './BrandMark';
import { HeaderButtons } from './HeaderButtons';
import { color, font } from '../lib/theme';
import { tr } from '../lib/i18n';

/**
 * Ana sayfanın marka başlığı: logo solda, arama / bildirim / mesaj sağda.
 * Diğer sekmeler telefonun kendi büyük başlığını kullanır; markanın göründüğü tek yer burası (Apple: marka içerikte, bir kez).
 */
export function HomeHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: color.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8 }}>
        {/* Logoya dokununca ana sayfa en üste çıkar */}
        <Pressable onPress={() => fireScrollTop('index')} hitSlop={8} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Makinasal" accessibilityHint={tr('En üste çık')}>
          <BrandMark size={28} />
          <PlainText style={{ color: color.ink, fontSize: 21, fontFamily: font.brand, letterSpacing: 1.6 }}>MAKİNA<PlainText style={{ color: color.accentText, fontSize: 21, fontFamily: font.brand, letterSpacing: 1.6 }}>SAL</PlainText></PlainText>
        </Pressable>
        <HeaderButtons />
      </View>
    </View>
  );
}
