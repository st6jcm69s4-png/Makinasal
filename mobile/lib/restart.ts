import { requireOptionalNativeModule } from 'expo';

/**
 * Uygulamayı yeniden başlatır (Expo Go ve expo-updates içeren sürümler).
 * DevSettings.reload() Expo Go'da yerel modülleri kaybettirdiği için kullanılmıyor.
 * Başarısız olursa false döner; o zaman kullanıcıdan uygulamayı kapatıp açması istenir.
 */
export async function restartApp(): Promise<boolean> {
  try {
    const m = requireOptionalNativeModule<{ reload?: () => Promise<void> }>('ExpoUpdates');
    if (m?.reload) { await m.reload(); return true; }
  } catch { /* yeniden başlatılamadı */ }
  return false;
}
