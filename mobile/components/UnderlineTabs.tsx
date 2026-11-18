import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from './LText';
import { NoSwipe } from './NoSwipe';
import { color, font } from '../lib/theme';
import { reduceMotion } from '../lib/motion';
import * as haptic from '../lib/haptics';

/*
 * Altı çizili alt sekmeler (İş Ağı: Kiralık / İşler / Parça talepleri / Firmalar).
 * Seçili sekmenin altındaki çizgi yumuşak bir yayla yeni sekmeye kayar ve genişliğini ona uydurur.
 * Sekmeler sığmazsa yatay kayar; seçilen sekme görünür alana getirilir.
 */
const SPRING = { stiffness: 170, damping: 25, mass: 1, useNativeDriver: false } as const;

export function UnderlineTabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  const [frames, setFrames] = useState<Record<string, { x: number; w: number }>>({});
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const scroller = useRef<{ scrollTo: (o: { x: number; animated: boolean }) => void } | null>(null);
  const placed = useRef(false);

  useEffect(() => {
    const f = frames[value];
    if (!f) return;
    if (!placed.current || reduceMotion()) { x.setValue(f.x); w.setValue(f.w); placed.current = true; }
    else { Animated.spring(x, { toValue: f.x, ...SPRING }).start(); Animated.spring(w, { toValue: f.w, ...SPRING }).start(); }
    scroller.current?.scrollTo({ x: Math.max(0, f.x - 24), animated: !reduceMotion() });
  }, [value, frames, x, w]);

  const onLayout = (k: string) => (e: LayoutChangeEvent) => {
    const { x: fx, width } = e.nativeEvent.layout;
    setFrames((cur) => (cur[k]?.x === fx && cur[k]?.w === width ? cur : { ...cur, [k]: { x: fx, w: width } }));
  };

  return (
    <NoSwipe>
      <View style={u.wrap}>
        <ScrollView ref={scroller as never} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={u.row} accessibilityRole="tablist">
          {tabs.map(([k, label]) => {
            const on = k === value;
            return (
              <Pressable key={k} onLayout={onLayout(k)} onPress={() => { if (!on) { haptic.tick(); onChange(k); } }} style={u.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={{ top: 4, bottom: 4 }}>
                <Text style={[u.label, on && u.labelOn]}>{label}</Text>
              </Pressable>
            );
          })}
          <Animated.View pointerEvents="none" style={[u.bar, { left: x, width: w }]} />
        </ScrollView>
      </View>
    </NoSwipe>
  );
}

const u = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  row: { paddingHorizontal: 12, gap: 4 },
  tab: { height: 46, paddingHorizontal: 12, justifyContent: 'center' },
  label: { color: color.muted, fontFamily: font.semi, fontSize: 15.5 },
  labelOn: { color: color.ink, fontFamily: font.bold },
  bar: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: color.teal },
});
