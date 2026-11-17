import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './LText';
import { font } from '../lib/theme';
import { EASE_OUT, reduceMotion } from '../lib/motion';

/*
 * İnternet bağlantısı kopunca ekranın üstünde küçük bir kapsül çıkar ("İnternet bağlantısı yok");
 * bağlantı gelince kendiliğinden kaybolur. Dokunmayı engellemez. Sayfalar artık sessizce boş kalmaz.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => NetInfo.addEventListener((s) => {
    // isInternetReachable ilk anda null olabilir; yalnızca kesin "yok" durumunda göster
    setOffline(s.isConnected === false || s.isInternetReachable === false);
  }), []);
  useEffect(() => {
    if (reduceMotion()) { a.setValue(offline ? 1 : 0); return; }
    Animated.timing(a, { toValue: offline ? 1 : 0, duration: 220, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [offline, a]);
  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { top: insets.top + 6, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]} accessibilityLiveRegion="polite">
      {offline ? (
        <View style={s.pill} accessibilityRole="alert">
          <Icon name="wifi-off" size={15} color="#FFFFFF" />
          <Text style={s.t}>İnternet bağlantısı yok</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: 'rgba(30,30,30,0.92)' },
  t: { color: '#FFFFFF', fontFamily: font.semi, fontSize: 13.5 },
});
