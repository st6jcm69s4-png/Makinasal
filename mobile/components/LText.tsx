import { Children, type ReactNode } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { tr } from '../lib/i18n';
import { useLang } from '../lib/lang';

const walk = (c: ReactNode): ReactNode => (typeof c === 'string' ? tr(c) : Array.isArray(c) ? Children.map(c, (x) => (typeof x === 'string' ? tr(x) : x)) : c);

/** react-native Text ile aynı; metinleri seçili dile çevirir. */
export function Text({ children, ...rest }: TextProps) {
  useLang();
  return <RNText {...rest}>{walk(children)}</RNText>;
}
export function TextInput({ placeholder, ...rest }: TextInputProps) {
  useLang();
  return <RNTextInput placeholder={placeholder ? tr(placeholder) : placeholder} {...rest} />;
}
