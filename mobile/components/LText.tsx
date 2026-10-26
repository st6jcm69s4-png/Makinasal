import { Children, createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { font, fontState } from '../lib/theme';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

const walk = (c: ReactNode): ReactNode => (typeof c === 'string' ? tr(c) : Array.isArray(c) ? Children.map(c, (x) => (typeof x === 'string' ? tr(x) : x)) : c);

/** Ağırlığa göre Barlow ailesini seçer; ekranda başka yazı tipi istenmişse dokunmaz. */
const Nested = createContext(false);
function typeStyle(style: unknown, nested = false) {
  if (!fontState.ok) return style;
  const flat = StyleSheet.flatten(style as object) as { fontFamily?: string; fontWeight?: string | number; fontSize?: number } | undefined;
  if (flat?.fontFamily) return style;
  const w = String(flat?.fontWeight ?? '400');
  const family = w === '700' || w === '800' || w === '900' || w === 'bold' ? font.bold : w === '600' ? font.semi : w === '500' ? font.medium : font.regular;
  // Barlow aynı punto için biraz küçük durur; okunurluk için hafifçe büyütülür.
  const size = flat?.fontSize ? Math.round(flat.fontSize * 1.08) : nested ? undefined : 16;
  return [style, { fontFamily: family, fontWeight: 'normal' as const, ...(size ? { fontSize: size } : {}), fontVariant: ['tabular-nums' as const] }];
}

/** react-native Text ile aynı; metinleri seçili dile çevirir ve Barlow ile yazar. */
export function Text({ children, style, ...rest }: TextProps) {
  useLang();
  const nested = useContext(Nested);
  return <RNText {...rest} style={typeStyle(style, nested) as TextProps['style']}><Nested.Provider value>{walk(children)}</Nested.Provider></RNText>;
}
/** Çevirisiz Text (ör. vurgulanmış arama eşleşmesi); yalnızca yazı tipini uygular. */
export function PlainText({ children, style, ...rest }: TextProps) {
  const nested = useContext(Nested);
  return <RNText {...rest} style={typeStyle(style, nested) as TextProps['style']}><Nested.Provider value>{children}</Nested.Provider></RNText>;
}
export function TextInput({ placeholder, style, ...rest }: TextInputProps) {
  useLang();
  return <RNTextInput placeholder={placeholder ? tr(placeholder) : placeholder} style={typeStyle(style) as TextInputProps['style']} {...rest} />;
}
