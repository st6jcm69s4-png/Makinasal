import type { MetadataRoute } from 'next';
import { PUBLIC_INDEXING,SITE_ORIGIN } from '@/lib/seo';
export default function robots():MetadataRoute.Robots{return {rules:PUBLIC_INDEXING?{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/profil','/mesajlar','/favoriler','/yonetim','/odemeler','/odeme','/giris','/ayarlar','/ilan-ver','/ilanlarim','/envanterim','/hesap-dogrula','/sifre-yenile']}:{userAgent:'*',disallow:'/'},sitemap:PUBLIC_INDEXING?SITE_ORIGIN+'/sitemap.xml':undefined};}
