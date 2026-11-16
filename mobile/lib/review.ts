import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/*
 * Uygulama içinden mağaza puanı isteme (App Store / Google Play'in kendi küçük penceresi).
 * Puan ve yorum sayısı mağaza sıralamasını doğrudan etkiler; ama kullanıcıyı rahatsız etmemek için
 * yalnızca iyi bir anın hemen ardından ve seyrek sorulur:
 *   - uygulama en az 3 farklı günde açılmış olmalı,
 *   - son sorudan bu yana en az 120 gün geçmiş olmalı (Apple ayrıca yılda en fazla 3 kez gösterir),
 *   - "iyi an": ilan satıldı olarak işaretlendi, ilan yayına gönderildi ya da 5. favori eklendi.
 * Hata ya da desteklenmeyen cihazda sessizce hiçbir şey yapmaz.
 */
const DAYS_KEY = 'makinasal-review-days';
const LAST_KEY = 'makinasal-review-last';
const FAV_KEY = 'makinasal-review-favs';
const MIN_DAYS = 3;
const GAP_MS = 120 * 86400000;

export type ReviewMoment = 'sold' | 'published' | 'favorite';

/** Uygulama her açıldığında çağrılır; kullanılan farklı günleri sayar (en fazla 10 gün tutulur). */
export async function noteAppOpen(): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const days: string[] = JSON.parse((await AsyncStorage.getItem(DAYS_KEY)) ?? '[]');
    if (days.includes(today)) return;
    await AsyncStorage.setItem(DAYS_KEY, JSON.stringify([...days, today].slice(-10)));
  } catch { /* depolama yoksa önemli değil */ }
}

/** İyi bir anın ardından çağrılır; koşullar uygunsa mağaza puan penceresini açar. */
export async function maybeAskReview(moment: ReviewMoment, delayMs = 1500): Promise<void> {
  try {
    if (moment === 'favorite') {
      const n = Number((await AsyncStorage.getItem(FAV_KEY)) ?? '0') + 1;
      await AsyncStorage.setItem(FAV_KEY, String(n));
      if (n < 5) return;
    }
    const days: string[] = JSON.parse((await AsyncStorage.getItem(DAYS_KEY)) ?? '[]');
    if (days.length < MIN_DAYS) return;
    const last = Number((await AsyncStorage.getItem(LAST_KEY)) ?? '0');
    if (Date.now() - last < GAP_MS) return;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(LAST_KEY, String(Date.now()));
    // Ekran geçişi ve bildirim bittikten sonra açılsın
    setTimeout(() => { void StoreReview.requestReview().catch(() => undefined); }, delayMs);
  } catch { /* sessizce geç */ }
}
