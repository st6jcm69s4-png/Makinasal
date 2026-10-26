import { Alert, Linking } from 'react-native';
import { SITE_URL } from './supabase';

/** Web sitesindeki bir sayfayı telefonun tarayıcısında açar. */
export function openWeb(path: string) {
  const base = SITE_URL.replace(/\/$/, '');
  if (!base) { Alert.alert('Web sitesi', 'Site adresi ayarlanmamış (.env içinde EXPO_PUBLIC_SITE_URL).'); return; }
  void Linking.openURL(base + path).catch(() => Alert.alert('Web sitesi', 'Sayfa açılamadı.'));
}
