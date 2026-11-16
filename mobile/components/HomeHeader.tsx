import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlainText } from './LText';
import { BrandMark } from './BrandMark';
import { HeaderButtons } from './HeaderButtons';
import { color, font } from '../lib/theme';

/**
 * Ana sayfanın marka başlığı: logo solda, arama / bildirim / mesaj sağda.
 * Diğer sekmeler telefonun kendi büyük başlığını kullanır; markanın göründüğü tek yer burası (Apple: marka içerikte, bir kez).
 */
export function HomeHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: color.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="header" accessibilityLabel="Makinasal">
          <BrandMark size={28} />
          <PlainText style={{ color: color.ink, fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>MAKİNA<PlainText style={{ color: color.accentText, fontSize: 21, fontFamily: font.bold, letterSpacing: 1.6 }}>SAL</PlainText></PlainText>
        </View>
        <HeaderButtons />
      </View>
    </View>
  );
}
