import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/mesajlar', '/ilanlarim', '/ilan-ver', '/odeme', '/odemeler', '/yonetim', '/hesap-dogrula', '/sifre-yenile', '/ayarlar', '/profil', '/envanterim'],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
