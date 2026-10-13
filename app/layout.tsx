import type { ReactNode } from 'react';
export const metadata = { title: 'Makinasal | İş Makinesi Pazarı', description: 'İş makineleri, günlük işler ve nakliye pazaryeri prototipi' };
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="tr"><body style={{margin:0}}>{children}</body></html>}
