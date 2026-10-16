import type { ReactNode } from 'react';
import './globals.css';
import { MarketProvider } from '@/components/MarketProvider';
import { AppServiceWorker } from '@/components/AppInstaller';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Makinasal | İş Makinesi Pazarı',
  description: 'İş makineleri, kamyonlar, çekiciler, yedek parça ve lastik ilanları. Satıcıyı tanı, güvenle al.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#13243c" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700&family=Noto+Sans:wght@400;500;600&display=swap" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
        <AppServiceWorker />
        <MarketProvider>
          <SiteHeader />
          <main id="main-content" className="wrap">{children}</main>
        </MarketProvider>
        <footer className="wrap" style={{ padding: '28px 0 96px' }}><nav className="acts-row" aria-label="Yardım bağlantıları"><a href="/destek">Yardım</a><a href="/guven">Güvenli alışveriş</a></nav><p className="sub">Makinasal · Beta · Ödeme ve emanet para kabul edilmez.</p></footer>
      </body>
    </html>
  );
}
