/**
 * İlan hakları (sunucu kuralı: supabase/migrations/20261117180000_listing_quota_credits.sql).
 * Ücretsiz ayda 2, Pro ayda 5, Firma Pro ayda 25; yıllık üyelikte 12 katı (60 / 300) tek seferde.
 * Hak bitince ek ilan hakkı (tek ilan) kullanılır: mağazadan satın alınır ya da davetle kazanılır.
 */
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { tr } from './i18n';
import { available as storeAvailable, buyListingCredit, loadListingCredit } from './purchases';
import { success as hapticSuccess } from './haptics';

export type Quota = { limit: number; used: number; remaining: number; credits: number; period: 'free' | 'monthly' | 'yearly'; resets_at: string };

export async function fetchQuota(): Promise<Quota | null> {
  const r = await supabase.rpc('my_listing_quota');
  return r.error || !r.data ? null : (r.data as Quota);
}

/** Sunucunun hak bitti hatası mı? */
export const isQuotaError = (message?: string | null) => !!message && message.includes('LISTING_QUOTA');

/** "Bu ay 2 ilan hakkından 1'i kaldı · 1 ek ilan hakkı" */
export function quotaLine(q: Quota, lang: 'tr' | 'en' | 'de'): string {
  const left = q.remaining;
  const per = q.period === 'yearly' ? tr('Bu üyelik yılında') : tr('Bu ay');
  const main = `${per}: ${left} / ${q.limit} ${tr('ilan hakkı kaldı')}`;
  const extra = q.credits > 0 ? ` · ${q.credits} ${tr('ek ilan hakkı')}` : '';
  const when = left === 0 && q.credits === 0
    ? ` · ${tr('Yenilenme')}: ${new Date(q.resets_at).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'tr-TR')}`
    : '';
  return main + extra + when;
}

/** Ek ilan hakkı satın alıp sunucuda görünmesini bekler. true: hak eklendi. */
export async function purchaseListingCredit(): Promise<boolean> {
  const prod = await loadListingCredit();
  if (!prod) {
    Alert.alert(tr('Ek ilan hakkı şu anda alınamıyor'), tr('Ek ilan hakkı, App Store veya Google Play’den indirilen Makinasal uygulamasında satın alınır.'));
    return false;
  }
  const before = (await fetchQuota())?.credits ?? 0;
  const r = await buyListingCredit(prod);
  if (r === 'cancelled') return false;
  if (r === 'pending') { Alert.alert(tr('Ödeme onay bekliyor'), tr('Mağaza ödemeyi onaylayınca ek ilan hakkın kendiliğinden eklenecek.')); return false; }
  if (r === 'error') { Alert.alert(tr('Ödeme tamamlanamadı'), tr('Kartından para çekilmedi. Bağlantını kontrol edip yeniden dene.')); return false; }
  for (let i = 0; i < 12; i++) {
    const q = await fetchQuota();
    if (q && q.credits > before) { hapticSuccess(); return true; }
    await new Promise((res) => setTimeout(res, 1500));
  }
  Alert.alert(tr('Ödeme alındı'), tr('Ek ilan hakkın birkaç dakika içinde hesabına eklenecek. Sonra ilanını yayınlayabilirsin; taslağın kayıtlı.'));
  return false;
}

/**
 * Yeni ilan için hak var mı? Yoksa seçenekleri sorar: ek ilan hakkı al / Premium'a geç / vazgeç.
 * true dönerse ilan kaydedilebilir.
 */
export async function ensureListingQuota(): Promise<boolean> {
  const q = await fetchQuota();
  if (!q || q.remaining > 0 || q.credits > 0) return true; // okunamazsa sunucu yine denetler
  return new Promise<boolean>((resolve) => {
    const prod = storeAvailable() ? loadListingCredit() : Promise.resolve(null);
    void prod.then((p) => {
      const buttons: { text: string; style?: 'cancel'; onPress: () => void }[] = [];
      if (p) buttons.push({ text: `${tr('Ek ilan hakkı al')} (${p.priceString})`, onPress: () => { void purchaseListingCredit().then(resolve); } });
      if (q.period !== 'yearly') buttons.push({ text: tr('Premium tarifeleri gör'), onPress: () => { resolve(false); router.push('/premium' as never); } });
      buttons.push({ text: tr('Vazgeç'), style: 'cancel', onPress: () => resolve(false) });
      const used = q.period === 'yearly' ? tr('Bu üyelik yılındaki ilan haklarının hepsini kullandın.') : tr('Bu ayki ilan haklarının hepsini kullandın.');
      Alert.alert(
        tr('İlan hakkın doldu'),
        `${used} (${q.limit}) ${tr('Tek bir ilan için ek ilan hakkı alabilir ya da daha fazla ilan hakkı olan bir tarifeye geçebilirsin. Taslağın kayıtlı kalır.')}`,
        buttons,
      );
    });
  });
}
