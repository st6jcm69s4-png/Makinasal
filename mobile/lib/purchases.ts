/**
 * Uygulama içi satın alma: Apple App Store ve Google Play (RevenueCat üzerinden).
 *
 * - Kart, Apple Pay, Google Pay, hediye kartı: hepsini mağaza kendi ödeme ekranında alır; biz kart bilgisi görmeyiz.
 * - İndirim kodu: App Store "offer code" / Google Play "promo code". iOS'ta kod ekranı uygulama içinde açılır.
 * - Üyeliği sunucu açar: RevenueCat → revenuecat-webhook → public.set_store_premium. Uygulama yalnızca profili yeniden okur.
 * - Expo Go'da ve anahtar girilmemişse satın alma kapalıdır (available() false döner).
 *
 * Mağazadaki ürün kimlikleri: makinasal.pro.monthly, makinasal.pro.yearly, makinasal.business.monthly, makinasal.business.yearly
 */
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { CustomerInfo, PurchasesPackage, PurchasesStoreProduct } from 'react-native-purchases';

type RC = typeof import('react-native-purchases').default;
export type StorePlan = 'pro' | 'business';
export type StorePeriod = 'monthly' | 'yearly';
export type StoreProduct = { pkg: PurchasesPackage; price: string; intro: string | null };
export type StoreProducts = Partial<Record<`${StorePlan}.${StorePeriod}`, StoreProduct>>;

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}) ?? '';
const inExpoGo = Constants.executionEnvironment === 'storeClient';

let rc: RC | null = null;
let configured = false;
let currentUser: string | null = null;

function lib(): RC | null {
  if (rc) return rc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rc = (require('react-native-purchases') as { default: RC }).default;
  } catch {
    rc = null;
  }
  return rc;
}

/** Bu cihazda mağaza ödemesi açılabilir mi (gerçek uygulama + anahtar var). */
export function available(): boolean {
  return Platform.OS !== 'web' && !inExpoGo && !!apiKey && !!lib();
}

function ready(): RC | null {
  if (!available()) return null;
  const P = lib()!;
  if (!configured) {
    P.configure({ apiKey, appUserID: currentUser ?? undefined });
    configured = true;
  }
  return P;
}

/** Oturum açan kullanıcıyı mağaza hesabına bağlar (webhook üyeliği doğru kişiye yazsın). */
export function usePurchasesUser(uid: string | undefined) {
  useEffect(() => {
    const P = ready();
    if (!P) { currentUser = uid ?? null; return; }
    if (uid && uid !== currentUser) {
      currentUser = uid;
      void P.logIn(uid).catch(() => undefined);
    } else if (!uid && currentUser) {
      currentUser = null;
      void P.logOut().catch(() => undefined);
    }
  }, [uid]);
}

const keyOf = (id: string): `${StorePlan}.${StorePeriod}` | null => {
  // Google Play kimliği "makinasal.pro.monthly:aylik" biçiminde gelebilir
  const m = /makinasal\.(pro|business)\.(monthly|yearly)/.exec(id);
  return m ? (`${m[1]}.${m[2]}` as `${StorePlan}.${StorePeriod}`) : null;
};

function introText(p: PurchasesStoreProduct): string | null {
  return p.introPrice ? p.introPrice.priceString : null;
}

/** Mağazadaki fiyatlar (kullanıcının ülkesine ve para birimine göre). */
export async function loadProducts(): Promise<StoreProducts> {
  const P = ready();
  if (!P) return {};
  const off = await P.getOfferings();
  const out: StoreProducts = {};
  const pkgs = [off.current, ...Object.values(off.all)].flatMap((o) => o?.availablePackages ?? []);
  for (const pkg of pkgs) {
    const k = keyOf(pkg.product.identifier);
    if (k && !out[k]) out[k] = { pkg, price: pkg.product.priceString, intro: introText(pkg.product) };
  }
  return out;
}

export type BuyResult = 'ok' | 'cancelled' | 'pending' | 'error';

export async function buy(p: StoreProduct): Promise<BuyResult> {
  const P = ready();
  if (!P) return 'error';
  try {
    const r = await P.purchasePackage(p.pkg);
    return hasActive(r.customerInfo) ? 'ok' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (err.userCancelled || err.code === P.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (err.code === P.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    return 'error';
  }
}

/** Daha önce bu Apple / Google hesabıyla alınmış üyeliği geri yükler (telefon değişince). */
export async function restore(): Promise<'ok' | 'none' | 'error'> {
  const P = ready();
  if (!P) return 'error';
  try {
    const info = await P.restorePurchases();
    return hasActive(info) ? 'ok' : 'none';
  } catch {
    return 'error';
  }
}

/** İndirim / teklif kodu: iOS'ta uygulama içinde Apple'ın kod ekranı, Android'de Google Play kod sayfası. */
export async function redeemCode(): Promise<void> {
  const P = ready();
  if (Platform.OS === 'ios' && P) {
    await P.presentCodeRedemptionSheet();
    return;
  }
  await Linking.openURL('https://play.google.com/redeem');
}

/** Üyeliği yönet / iptal et: mağazanın abonelik ekranı. */
export async function manage(): Promise<void> {
  const P = ready();
  try {
    if (P) { await P.showManageSubscriptions(); return; }
  } catch { /* aşağıdaki bağlantıya düş */ }
  await Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');
}

function hasActive(info: CustomerInfo): boolean {
  return Object.keys(info.entitlements.active).length > 0 || info.activeSubscriptions.length > 0;
}
