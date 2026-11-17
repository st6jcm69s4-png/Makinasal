import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/*
 * Çökme ve hata takibi: yakalanmamış hatalar ve ekranı düşüren hatalar veritabanına (public.app_errors)
 * kaydedilir; yönetici görür, 30 gün sonra silinir. Kişisel veri yazılmaz (yalnızca hata metni,
 * yığın izi, ekran yolu, sürüm). Aynı hata 60 saniye içinde tekrar gönderilmez.
 */
let route = '';
export const setErrorRoute = (r: string) => { route = r.slice(0, 200); };

const recent = new Map<string, number>();
export function reportError(err: unknown, fatal = false) {
  try {
    if (__DEV__) return; // geliştirmede Expo'nun kendi hata ekranı yeterli
    const e = err instanceof Error ? err : new Error(String(err));
    const message = (e.message || 'Bilinmeyen hata').slice(0, 2000);
    const now = Date.now();
    if ((recent.get(message) ?? 0) > now - 60000) return;
    recent.set(message, now);
    void supabase.from('app_errors').insert({
      message,
      stack: (e.stack ?? '').slice(0, 8000) || null,
      fatal,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
      app_version: String(Constants.expoConfig?.version ?? '').slice(0, 40) || null,
      route: route || null,
    }).then(() => undefined, () => undefined);
  } catch { /* hata raporlarken hata çıkmasın */ }
}

/** Yakalanmamış JS hatalarını yakalar (uygulama açılırken bir kez). */
let installed = false;
export function installErrorReporting() {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, f?: boolean) => void; setGlobalHandler: (h: (e: unknown, f?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => { reportError(e, !!fatal); prev(e, fatal); });
}
