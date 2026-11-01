import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from './LText';
import { Label } from './ui';
import { PickerModal } from './PickerModal';
import { countryList, toE164 } from '../lib/countries';
import { localeOf } from '../lib/i18n';
import { useLang } from '../lib/lang';
import { color, radius } from '../lib/theme';

export type PhoneValue = { iso: string; national: string };
export const emptyPhone: PhoneValue = { iso: 'TR', national: '' };

/** Ülke bayrağı + kod seçici ve numara kutusu. Türkiye (+90) varsayılandır. */
export function PhoneField({ label, value, onChange }: { label: string; value: PhoneValue; onChange: (v: PhoneValue) => void }) {
  const { lang } = useLang();
  const list = useMemo(() => countryList(localeOf(lang)), [lang]);
  const cur = list.find((c) => c.iso === value.iso) ?? list[0];
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <View style={s.row}>
        <Pressable style={s.code} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={cur.name}>
          <PlainText style={s.flag}>{cur.flag}</PlainText>
          <PlainText style={s.dial}>{'+' + cur.dial}</PlainText>
          <Text style={s.caret}>▾</Text>
        </Pressable>
        <TextInput style={s.input} value={value.national} onChangeText={(t) => onChange({ ...value, national: t })} keyboardType="phone-pad" placeholder={cur.iso === 'TR' ? '05XX XXX XX XX' : ''} textContentType="telephoneNumber" autoComplete="tel" />
      </View>
      <PickerModal
        visible={open} title="Ülke kodu" searchable selected={cur.iso}
        options={list.map((c) => ({ value: c.iso, label: `${c.flag}  ${c.name}  (+${c.dial})` }))}
        onPick={(iso) => onChange({ ...value, iso })} onClose={() => setOpen(false)}
      />
    </View>
  );
}

export const phoneToE164 = (v: PhoneValue) => {
  const dial = countryList('en').find((c) => c.iso === v.iso)?.dial ?? '90';
  return toE164(dial, v.national);
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, borderRadius: radius, paddingHorizontal: 10, minHeight: 46 },
  flag: { fontSize: 22 },
  dial: { fontSize: 15, color: color.ink, fontWeight: '600' },
  caret: { color: color.muted, fontSize: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, borderRadius: radius, paddingHorizontal: 12, minHeight: 46, fontSize: 16 },
});
