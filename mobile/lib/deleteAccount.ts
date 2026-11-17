import { Alert } from 'react-native';
import { router } from 'expo-router';
import { tr } from './i18n';
import { supabase } from './supabase';
import { toast } from '../components/Toast';

/*
 * Uygulama içinden hesap silme (Apple 5.1.1(v)). Sunucuda supabase/functions/delete-account çalışır:
 * kişisel bilgiler ve ilanlar silinir, giriş kalıcı olarak kapanır. Mesajlar ve ödeme kayıtları
 * karşı tarafın kaydı ve yasal saklama nedeniyle "Silinmiş üye" adıyla kalır.
 */
export function confirmDeleteAccount() {
  Alert.alert(
    tr('Hesabı sil'),
    tr('Hesabın kalıcı olarak silinecek: profil bilgilerin, ilanların, fotoğrafların, favorilerin ve kayıtlı aramaların kaldırılır. Mesajlaştığın kişilerde yazışmalar "Silinmiş üye" adıyla kalır; yasal olarak saklanması gereken ödeme kayıtları süresi dolana kadar tutulur. Bu işlem geri alınamaz.'),
    [
      { text: tr('Vazgeç'), style: 'cancel' },
      { text: tr('Hesabı kalıcı olarak sil'), style: 'destructive', onPress: () => void run() },
    ],
  );
}

async function run() {
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  const code = (data as { error?: string } | null)?.error ?? '';
  if (error || code) {
    // Açık artırmada teklif almış ya da önde olan kullanıcı, açık artırma bitene kadar silemez
    const ctx = (error as { context?: Response } | null)?.context;
    let c = code;
    if (!c && ctx) { try { c = ((await ctx.json()) as { error?: string }).error ?? ''; } catch { /* yok say */ } }
    if (c === 'ACTIVE_AUCTION') {
      Alert.alert(tr('Hesabı sil'), tr('Teklif almış ya da önde olduğun bir açık artırma sürüyor. Açık artırma bitince hesabını silebilirsin.'));
    } else {
      Alert.alert(tr('Hesabı sil'), tr('Hesap şu an silinemedi. Bağlantını kontrol edip tekrar dene; sorun sürerse destek ile iletişime geç.'));
    }
    return;
  }
  await supabase.auth.signOut().catch(() => undefined);
  router.replace('/');
  toast('Hesabın silindi.');
}
