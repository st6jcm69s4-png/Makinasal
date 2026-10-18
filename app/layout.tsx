import { cookies } from 'next/headers';
import { LanguageProvider, SiteFooter, Text } from '@/components/LanguageProvider';
import { LANGUAGE_COOKIE, validLanguage } from '@/lib/i18n';
import type { ReactNode } from 'react';
import './globals.css';
import { MarketProvider } from '@/components/MarketProvider';
import { AppServiceWorker } from '@/components/AppInstaller';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Makinasal | Makine, İş ve Şirket Ağı',
  description: 'Satılık ve kiralık iş makineleri, kamyonlar, operatörler, iş ve parça talepleri. Bölgenizdeki hafriyat şirketlerini ve filolarını keşfedin.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const language = validLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return (
    <html lang={language}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#25272D" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700&family=Noto+Sans:wght@400;500;600&display=swap" />
      </head>
      <body>
        <LanguageProvider initialLanguage={language}>
        <a className="skip-link" href="#main-content"><Text value="Ana içeriğe geç" /></a>
        <AppServiceWorker />
        <MarketProvider>
          <SiteHeader />
          <main id="main-content" className="wrap">{children}</main>
        </MarketProvider>
        <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
