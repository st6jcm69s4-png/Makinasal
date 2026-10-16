import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Makinasal — İş Makinesi Pazarı', short_name: 'Makinasal',
    description: 'İş makinesi, kamyon ve yedek parça ilanları.',
    start_url: '/', scope: '/', display: 'standalone', lang: 'tr',
    background_color: '#f4f6f9', theme_color: '#13243c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
