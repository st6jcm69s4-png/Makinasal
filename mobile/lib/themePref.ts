import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Appearance, Platform } from 'react-native';
import { THEME_FILE, launchScheme, readPref, writePref } from './theme';
import { restartApp } from './restart';
import { tr } from './i18n';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'mk-theme';

const asChoice = (v: string | null | undefined): ThemeChoice => (v === 'light' || v === 'dark' ? v : 'system');

/*
 * Seçili görünüm uygulama içinde de tutulur: başlık çubuğu (telefonun kendi parçası) rengini buradan alır.
 * iPhone'da görünüm değişikliği önce burada yapılır; telefonun görünümü, başlık yeni rengini aldıktan hemen sonra
 * (aynı karede) değiştirilir (ThemeApplier). Böylece başlık ve sayfa birlikte döner.
 */
let choice: ThemeChoice = Platform.OS === 'android' ? asChoice(readPref(THEME_FILE)) : 'system';
const subs = new Set<() => void>();
export const getThemeChoice = () => choice;
export function subscribeThemeChoice(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
function setChoice(c: ThemeChoice) {
  if (c === choice) return;
  choice = c;
  subs.forEach((f) => f());
}
/** Telefonun görünümünü seçime uydurur (ThemeApplier çağırır). */
export function applyAppearance(c: ThemeChoice) {
  try { Appearance.setColorScheme(c === 'system' ? 'auto' : c); } catch { /* yok say */ }
}

/** Kayıtlı görünüm tercihini okuyup uygular (iOS'ta renkler anında değişir). */
export async function loadTheme(): Promise<ThemeChoice> {
  if (Platform.OS === 'android') return asChoice(readPref(THEME_FILE));
  try {
    const v = await AsyncStorage.getItem(KEY);
    const c = asChoice(v);
    setChoice(c);
    applyAppearance(c);
    return c;
  } catch {
    return 'system';
  }
}

/** Android: yeni görünüm açılıştakinden farklıysa uygulamayı yeniden başlatır. */
let restarting = false;
async function applyAndroid(): Promise<void> {
  if (restarting) return;
  const c = asChoice(readPref(THEME_FILE));
  const sys = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const want = c === 'system' ? sys : c;
  if (want === launchScheme) return;
  restarting = true;
  const ok = await restartApp();
  restarting = false;
  if (!ok) Alert.alert(tr('Görünüm'), tr('Yeni görünüm için uygulamayı tamamen kapatıp yeniden aç.'));
}

export async function saveTheme(c: ThemeChoice): Promise<void> {
  // Önce dosyaya yazılır: Android açılışta buradan okur, görünüm dinleyicisi de buna bakar.
  writePref(THEME_FILE, c);
  if (Platform.OS === 'ios') setChoice(c); // telefonun görünümünü ThemeApplier değiştirir
  else { setChoice(c); applyAppearance(c); }
  try {
    if (c === 'system') await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, c);
  } catch {}
  if (Platform.OS === 'android') await applyAndroid();
}

/** Android: "Sistem" seçiliyken telefonun görünümü değişirse uygulamayı yeni renklerle yeniden başlatır. */
export function watchSystemTheme(): () => void {
  if (Platform.OS !== 'android') return () => {};
  const sub = Appearance.addChangeListener(() => {
    if (asChoice(readPref(THEME_FILE)) === 'system') void applyAndroid();
  });
  return () => sub.remove();
}
