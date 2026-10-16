'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="panel" role="alert"><h1>Sayfa yüklenemedi</h1><p>Beklenmeyen bir sorun oluştu. Lütfen tekrar dene.</p><div className="acts-row"><button className="btn" onClick={reset}>Tekrar dene</button><Link className="btn ghost" href="/ilanlar">İlanlara dön</Link></div></div>;
}
