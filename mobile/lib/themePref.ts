import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'mk-theme';

/** Kayıtlı görünüm tercihini okuyup uygular (iOS'ta renkler anında değişir). */
export async function loadTheme(): Promise<ThemeChoice> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    const c: ThemeChoice = v === 'light' || v === 'dark' ? v : 'system';
    Appearance.setColorScheme(c === 'system' ? null : c);
    return c;
  } catch {
    return 'system';
  }
}

export async function saveTheme(c: ThemeChoice): Promise<void> {
  Appearance.setColorScheme(c === 'system' ? null : c);
  try {
    if (c === 'system') await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, c);
  } catch {}
}
