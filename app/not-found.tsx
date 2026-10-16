import Link from 'next/link';
export default function NotFound() {
  return <div className="panel"><h1>Sayfa bulunamadı</h1><p>Bağlantı değişmiş veya sayfa kaldırılmış olabilir.</p><Link className="btn" href="/ilanlar">İlanları incele</Link></div>;
}
