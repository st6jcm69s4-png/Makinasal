import { Children, createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, Platform } from 'react-native';
import { color, font, fontState } from '../lib/theme';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

/** Varsayılan yazı rengi (koyu görünümde siyah metin kalmasın); ekranlardaki renkler bunu ezer. */
// Android yazının üstüne fazladan boşluk ekler (Inter'de yazı aşağı kayık görünür); iPhone ile aynı hizaya getir.
const base = Platform.OS === 'android' ? { color: color.ink, includeFontPadding: false } : { color: color.ink };
const walk = (c: ReactNode): ReactNode => (typeof c === 'string' ? tr(c) : Array.isArray(c) ? Children.map(c, (x) => (typeof x === 'string' ? tr(x) : x)) : c);

/** Ağırlığa göre yazı ailesini seçer (kalın: Barlow, diğerleri: Inter); ekranda başka yazı tipi istenmişse dokunmaz. */
const Nested = createContext(false);
/**
 * Genel boyut: ekranlardaki puntolar bir tık büyütülür. Barlow dar bir yazı olduğu için biraz daha fazla.
 * Satır yüksekliği de aynı oranda büyür (yazının üstü/altı kesilmesin).
 */
const SCALE_TEXT = 1.05;
const SCALE_DISPLAY = 1.08;
/*
 * Harf aralığı boyuta göre değişir (Apple yönergesi: büyük yazıda sıkı, küçük yazıda biraz açık).
 * Inter'in kendi önerdiği formül: em = -0.0223 + 0.185·e^(-0.1745·punto). 11 pt ≈ +0.07, 16 pt ≈ -0.18, 24 pt ≈ -0.47.
 * Ekran harf aralığını kendisi belirlemişse (ör. büyük harfli etiketler) dokunulmaz. Barlow zaten dar, ona uygulanmaz.
 */
const interTracking = (size: number) => Math.round(size * (-0.0223 + 0.185 * Math.exp(-0.1745 * size)) * 100) / 100;
const scaled = (flat: { fontSize?: number; lineHeight?: number; letterSpacing?: number } | undefined, k: number, fallback?: number, inter = false) => {
  const size = flat?.fontSize ?? fallback;
  const px = size ? Math.round(size * k * 2) / 2 : undefined;
  return {
    ...(px ? { fontSize: px } : {}),
    ...(flat?.lineHeight ? { lineHeight: Math.round(flat.lineHeight * k) } : {}),
    ...(inter && px && flat?.letterSpacing === undefined ? { letterSpacing: interTracking(px) } : {}),
  };
};
function typeStyle(style: unknown, nested = false) {
  if (!fontState.ok) return style;
  const flat = StyleSheet.flatten(style as object) as { fontFamily?: string; fontWeight?: string | number; fontSize?: number; lineHeight?: number; letterSpacing?: number } | undefined;
  if (flat?.fontFamily) {
    const k = flat.fontFamily.startsWith('Barlow') ? SCALE_DISPLAY : flat.fontFamily.startsWith('Inter') ? SCALE_TEXT : 1;
    return k === 1 ? style : [style, scaled(flat, k, nested ? undefined : 16, k === SCALE_TEXT)];
  }
  const w = String(flat?.fontWeight ?? '400');
  const heavy = w === '700' || w === '800' || w === '900' || w === 'bold';
  // Tek başına kalın yazı (başlık, düğme, rozet) Barlow; cümle içindeki kalın kelime Inter kalır.
  const family = heavy ? (nested ? font.textBold : font.bold) : w === '600' ? font.semi : w === '500' ? font.medium : font.regular;
  const k = family === font.bold ? SCALE_DISPLAY : SCALE_TEXT;
  return [style, { fontFamily: family, fontWeight: 'normal' as const, ...scaled(flat, k, nested ? undefined : 16, k === SCALE_TEXT), fontVariant: ['tabular-nums' as const] }];
}

/** react-native Text ile aynı; metinleri seçili dile çevirir ve Inter ile yazar. */
export function Text({ children, style, ...rest }: TextProps) {
  useLang();
  const nested = useContext(Nested);
  return <RNText {...rest} style={[nested ? null : base, typeStyle(style, nested)] as TextProps['style']}><Nested.Provider value>{walk(children)}</Nested.Provider></RNText>;
}
/** Çevirisiz Text (ör. vurgulanmış arama eşleşmesi); yalnızca yazı tipini uygular. */
export function PlainText({ children, style, ...rest }: TextProps) {
  const nested = useContext(Nested);
  return <RNText {...rest} style={[nested ? null : base, typeStyle(style, nested)] as TextProps['style']}><Nested.Provider value>{children}</Nested.Provider></RNText>;
}
export function TextInput({ placeholder, style, ...rest }: TextInputProps) {
  useLang();
  return <RNTextInput placeholder={placeholder ? tr(placeholder) : placeholder} placeholderTextColor={color.muted} style={[base, typeStyle(style)] as TextInputProps['style']} {...rest} />;
}
