import { useEffect } from 'react';
import { NativeTabs } from 'expo-router/native-tabs';
import { color } from '../../lib/theme';
import { useApp } from '../../lib/AppContext';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { watchUnread } from '../../lib/unread';

/*
 * Alt menü: telefonun kendi sekme çubuğu.
 * - iPhone (iOS 26+): cam görünümlü sistem çubuğu, aşağı kaydırınca küçülür; simgeler SF Symbols.
 * - Android: Material 3 alt gezinme çubuğu; simgeler Material Symbols.
 * Apple yönergesi: sekmeler yalnızca gezinir, eylem yapmaz. Bu yüzden "İlan ver" de bir sekmedir
 * ve ne tür ilan verileceğini seçtiren bir sayfa açar. Açık sekmeye tekrar dokununca liste en üste çıkar (sistem).
 */
export default function TabsLayout() {
  const { session } = useApp();
  useLang();
  useEffect(() => { watchUnread(session?.user.id ?? ''); }, [session]);
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={color.accentText}
      iconColor={{ default: color.muted, selected: color.accentText }}
      labelStyle={{ default: { color: color.muted }, selected: { color: color.accentText } }}
      // Android çubuğu ve seçili simgenin arkasındaki hap
      backgroundColor={color.surface}
      indicatorColor={color.tealSoft}
      rippleColor={color.plate}
    >
      {/* Ana sayfanın kendi marka başlığı var; altında kaydırma çubuğu ilk öğe değil, çubuk saydamlaşmasın */}
      <NativeTabs.Trigger name="index" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{tr('Ana sayfa')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ilanlar">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
        <NativeTabs.Trigger.Label>{tr('İlanlar')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="yeni">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
        <NativeTabs.Trigger.Label>{tr('İlan ver')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="is-agi">
        <NativeTabs.Trigger.Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} md="work" />
        <NativeTabs.Trigger.Label>{tr('İş Ağı')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="hesap">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>{tr('Hesabım')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
