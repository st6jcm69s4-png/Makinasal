import { Alert, Linking } from 'react-native';
import { SITE_URL } from './supabase';
import { getLang } from './i18n';

/** Web sitesindeki bir sayfayı telefonun tarayıcısında açar. */
export function openWeb(path: string) {
  const base = SITE_URL.replace(/\/$/, '');
  if (!base) { Alert.alert('Web sitesi', 'Site adresi ayarlanmamış (.env içinde EXPO_PUBLIC_SITE_URL).'); return; }
  // Uygulamadaki dil seçimi tarayıcıda da geçerli olsun (site ?lang= değerini çerezine yazar).
  const url = base + path + (path.includes('?') ? '&' : '?') + 'lang=' + getLang();
  void Linking.openURL(url).catch(() => Alert.alert('Web sitesi', 'Sayfa açılamadı.'));
}
