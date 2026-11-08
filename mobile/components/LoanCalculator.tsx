import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from './LText';
import { color, font, radius, shadow } from '../lib/theme';
import { tl } from '../lib/supabase';

const DOWN = [0, 20, 30, 50];
const TERMS = [12, 24, 36, 48];

/** Eşit taksitli kredi: aylık taksit = A·r / (1 − (1+r)^−n). */
export function monthlyPayment(principal: number, monthlyRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRatePct / 100;
  if (r <= 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function Choice({ items, value, onChange, fmt }: { items: number[]; value: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <View style={s.seg} accessibilityRole="radiogroup">
      {items.map((v) => {
        const on = v === value;
        return (
          <Pressable key={v} style={[s.segItem, on && s.segOn]} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <PlainText style={[s.segT, on && { color: color.tealInk }]}>{fmt(v)}</PlainText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** İlan sayfasında kredi / leasing hesaplayıcı (bilgi amaçlı). */
export function LoanCalculator({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [term, setTerm] = useState(36);
  const [rate, setRate] = useState('3');
  const r = Number(rate.replace(',', '.'));
  const rateOk = Number.isFinite(r) && r >= 0 && r <= 15;
  const res = useMemo(() => {
    const principal = Math.max(0, price * (1 - down / 100));
    const m = monthlyPayment(principal, rateOk ? r : 0, term);
    return { principal, m, total: m * term + price * (down / 100) };
  }, [price, down, term, r, rateOk]);

  return (
    <View style={s.card}>
      <Text style={s.k}>Peşinat</Text>
      <Choice items={DOWN} value={down} onChange={setDown} fmt={(v) => `%${v}`} />
      <Text style={s.k}>Vade</Text>
      <Choice items={TERMS} value={term} onChange={setTerm} fmt={(v) => `${v} ay`} />
      <View style={s.rateRow}>
        <Text style={[s.k, { flex: 1, marginTop: 0 }]}>Aylık faiz oranı (%)</Text>
        <TextInput style={[s.rate, !rateOk && { borderColor: color.bad }]} value={rate} onChangeText={setRate} keyboardType="decimal-pad" maxLength={5} accessibilityLabel="Aylık faiz oranı" />
      </View>
      <View style={s.result}>
        <Text style={s.resK}>Tahmini aylık taksit</Text>
        <PlainText style={s.resV}>{rateOk ? tl(Math.round(res.m)) : '—'}</PlainText>
        <View style={s.resRow}>
          <Text style={s.resS}>Peşinat</Text><PlainText style={s.resS2}>{tl(Math.round(price * down / 100))}</PlainText>
        </View>
        <View style={s.resRow}>
          <Text style={s.resS}>Kredi tutarı</Text><PlainText style={s.resS2}>{tl(Math.round(res.principal))}</PlainText>
        </View>
        <View style={s.resRow}>
          <Text style={s.resS}>Toplam ödeme</Text><PlainText style={s.resS2}>{rateOk ? tl(Math.round(res.total)) : '—'}</PlainText>
        </View>
      </View>
      <Text style={s.note}>Bilgi amaçlı tahmindir; vergi ve masraflar dahil değildir. Gerçek oran ve koşullar için bankana veya leasing şirketine danış.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, backgroundColor: color.surface, borderRadius: radius + 4, padding: 14, gap: 8, ...shadow },
  k: { color: color.muted, fontFamily: font.semi, fontSize: 13.5, marginTop: 4 },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius, backgroundColor: color.bg, borderWidth: 1, borderColor: color.line },
  segItem: { flex: 1, minHeight: 38, borderRadius: radius - 3, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.teal },
  segT: { color: color.ink, fontFamily: font.semi, fontSize: 14 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  rate: { width: 80, minHeight: 42, textAlign: 'center', fontSize: 16, fontFamily: font.semi, color: color.ink, backgroundColor: color.bg, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  result: { marginTop: 8, padding: 12, borderRadius: radius, backgroundColor: color.tealSoft, gap: 4 },
  resK: { color: color.ink, fontFamily: font.semi, fontSize: 14 },
  resV: { color: color.tealText, fontFamily: font.bold, fontSize: 26, marginBottom: 4 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resS: { color: color.ink, fontSize: 13.5 },
  resS2: { color: color.ink, fontFamily: font.semi, fontSize: 13.5 },
  note: { color: color.muted, fontSize: 12.5, lineHeight: 18 },
});
