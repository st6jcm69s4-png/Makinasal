import { Alert } from 'react-native';
import { tr } from './i18n';
import { supabase } from './supabase';

/** Çıkıştan önce resmi bir onay sorar. Çıkış yapıldıysa true döner. */
export function confirmSignOut(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      tr('Çıkış yap'),
      tr('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'),
      [
        { text: tr('Vazgeç'), style: 'cancel', onPress: () => resolve(false) },
        { text: tr('Çıkış yap'), style: 'destructive', onPress: () => { void supabase.auth.signOut().then(() => resolve(true)); } },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
