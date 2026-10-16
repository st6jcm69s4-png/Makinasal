import type { ReactNode } from 'react';
import './globals.css';
import { MarketProvider } from '@/components/MarketProvider';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Makinasal | İş Makinesi Pazarı',
  description: 'İş makineleri, kamyonlar, çekiciler, yedek parça ve lastik ilanları. Satıcıyı tanı, güvenle al.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700&family=Noto+Sans:wght@400;500;600&display=swap" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
        <MarketProvider>
          <SiteHeader />
          <main id="main-content" className="wrap">{children}</main>
        </MarketProvider>
      </body>
    </html>
  );
}
