import { Share } from 'react-native';
import { SITE_URL } from './supabase';

/** Bir sayfayı paylaş: başlık ve (site adresi tanımlıysa) web bağlantısı. path: ör. "/magaza/123" */
export function shareLink(title: string, path: string, extra?: string) {
  const url = SITE_URL ? `${SITE_URL.replace(/\/$/, '')}${path}` : '';
  void Share.share({ message: [title, extra, url].filter(Boolean).join('\n') }).catch(() => undefined);
}
