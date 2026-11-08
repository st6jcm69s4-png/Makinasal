/**
 * Telefona anlık bildirim (Expo push).
 *
 * DİKKAT: Bu dosya şimdilik hiçbir yerden içe aktarılmıyor; çünkü `expo-notifications` paketi
 * henüz kurulu değil. Paket kurulunca app/_layout.tsx içinde `usePushNotifications()` çağrılır
 * (adımlar: docs içindeki not ve devam notları).
 *
 * Sunucu tarafı hazır: public.register_push_token RPC'si cihazı kaydeder; notifications tablosuna
 * eklenen her satır makinasal_private.push_notification tetikleyicisiyle Expo'ya gönderilir.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { notificationTarget } from './notifyTarget';

type Perm = { status: string; canAskAgain?: boolean };
type Response = { notification: { request: { content: { data?: Record<string, unknown> } } } };
type Sub = { remove(): void };
type NotificationsModule = {
  setNotificationHandler(h: { handleNotification: () => Promise<Record<string, boolean>> }): void;
  getPermissionsAsync(): Promise<Perm>;
  requestPermissionsAsync(): Promise<Perm>;
  getExpoPushTokenAsync(o: { projectId?: string }): Promise<{ data: string }>;
  setNotificationChannelAsync?(id: string, o: Record<string, unknown>): Promise<unknown>;
  addNotificationResponseReceivedListener(cb: (r: Response) => void): Sub;
  getLastNotificationResponseAsync?(): Promise<Response | null>;
  AndroidImportance?: { DEFAULT: number; HIGH: number };
};

function mod(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

let currentToken: string | null = null;

function projectId(): string | undefined {
  const c = Constants as unknown as { expoConfig?: { extra?: { eas?: { projectId?: string } } }; easConfig?: { projectId?: string } };
  return c.expoConfig?.extra?.eas?.projectId ?? c.easConfig?.projectId;
}

/** İzin ister, cihaz anahtarını alır ve sunucuya kaydeder. Sessizce başarısız olabilir. */
export async function registerForPush(): Promise<boolean> {
  const N = mod();
  if (!N) return false;
  try {
    if (Platform.OS === 'android' && N.setNotificationChannelAsync) {
      await N.setNotificationChannelAsync('default', { name: 'Bildirimler', importance: N.AndroidImportance?.HIGH ?? 4 });
    }
    let perm = await N.getPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain !== false) perm = await N.requestPermissionsAsync();
    if (perm.status !== 'granted') return false;
    const { data: token } = await N.getExpoPushTokenAsync({ projectId: projectId() });
    if (!token) return false;
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    if (error) return false;
    currentToken = token;
    return true;
  } catch {
    return false;
  }
}

/** Çıkış yaparken bu cihazın anahtarını sil (başka hesaba bildirim gitmesin). */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try { await supabase.from('push_tokens').delete().eq('token', currentToken); } catch { /* yok say */ }
  currentToken = null;
}

function open(r: Response | null) {
  const url = r?.notification.request.content.data?.url;
  const t = typeof url === 'string' ? notificationTarget(url) : null;
  if (t) router.push(t as never);
  else if (r) router.push('/bildirimler' as never);
}

/** Kök düzende bir kez çağrılır: oturum açıksa kaydeder, bildirime dokununca ilgili ekranı açar. */
export function usePushNotifications(userId: string | null | undefined) {
  const handled = useRef(false);
  useEffect(() => {
    const N = mod();
    if (!N) return;
    N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowAlert: true }) });
    const sub = N.addNotificationResponseReceivedListener((r) => open(r));
    if (!handled.current && N.getLastNotificationResponseAsync) {
      handled.current = true;
      void N.getLastNotificationResponseAsync().then((r) => { if (r) open(r); }).catch(() => undefined);
    }
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (userId) void registerForPush();
  }, [userId]);
}
