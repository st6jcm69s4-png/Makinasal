import type { ReactNode } from 'react';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Makinasal | İş Makinesi Pazarı',
  description: 'İş makineleri, kamyonlar, yedek parça ve lastik ilanları',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <SiteHeader />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
