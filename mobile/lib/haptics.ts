import * as Haptics from 'expo-haptics';

/*
 * Dokunsal geri bildirim (titreşim). Kurallar (bkz. .claude/skills/animate-expo › Haptics):
 * - Yalnızca anlamlı anlarda: bir şey yerine oturdu, işlem başarılı/başarısız, seçim değişti.
 * - Görsel geri bildirimle aynı anda ve onun yerine değil (birçok kişide titreşim kapalıdır).
 * - Kaydırırken, her karede ya da kullanıcının yapmadığı bir harekette asla.
 * Desteklemeyen cihazda sessizce hiçbir şey yapmaz.
 */
const safe = (p: Promise<void>) => { void p.catch(() => undefined); };

/** Seçim bir adım değişti (sekme, filtre çipi). */
export const tick = () => safe(Haptics.selectionAsync());
/** Bir şey yerine oturdu (favoriye eklendi, sürükleme tamamlandı). */
export const tap = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** İşlem başarılı (ilan gönderildi, teklif verildi). */
export const success = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
/** İşlem başarısız. */
export const failure = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
