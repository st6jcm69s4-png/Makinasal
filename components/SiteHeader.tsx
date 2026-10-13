import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/ilanlar" className="logo">
          Makin<b>⚙</b>sal<small>İş makinesi pazarı</small>
        </Link>
        <nav aria-label="Ana menü">
          <Link href="/ilanlar" aria-current="page">İlanlar</Link>
          <a href="/prototip.html">Prototip</a>
        </nav>
        <span className="demo">Demo veri</span>
      </div>
    </header>
  );
}
