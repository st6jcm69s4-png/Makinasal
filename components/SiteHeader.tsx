'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';

const NAV: { href: string; label: string; match: (p: string) => boolean; badge?: 'unread' | 'favs' }[] = [
  { href: '/', label: 'Ana sayfa', match: (p) => p === '/' },
  { href: '/ilanlar', label: 'Ara', match: (p) => p.startsWith('/ilanlar') || p.startsWith('/karsilastir') || p.startsWith('/magaza') },
  { href: '/ilan-ver', label: 'İlan ver', match: (p) => p.startsWith('/ilan-ver') },
  { href: '/mesajlar', label: 'Mesajlar', match: (p) => p.startsWith('/mesajlar'), badge: 'unread' },
  { href: '/favoriler', label: 'Favoriler', match: (p) => p.startsWith('/favoriler'), badge: 'favs' },
  { href: '/profil', label: 'Profil', match: (p) => p.startsWith('/profil') || p.startsWith('/ilanlarim') },
  { href: '/premium', label: 'Premium', match: (p) => p.startsWith('/premium') },
  { href: '/guven', label: 'Güven sistemi', match: (p) => p.startsWith('/guven') },
  { href: '/yol-haritasi', label: 'Yol haritası', match: (p) => p.startsWith('/yol-haritasi') },
];

export function SiteHeader() {
  const path = usePathname() ?? '/';
  const router = useRouter();
  const { profile, authReady, unread, favNews } = useMarket();
  const label = profile ? profile.full_name || profile.email || 'Hesabım' : '';
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Makinasal ana sayfa">
          <svg className="gear" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" /><path d="M12 2.5l1.6 2.6 3-.8.8 3 2.9 1.2-1 3 1 3-2.9 1.2-.8 3-3-.8L12 21.5l-1.6-2.6-3 .8-.8-3L3.7 15.5l1-3-1-3 2.9-1.2.8-3 3 .8z" />
          </svg>
          <span>Makinasal<small>İş makinesi pazarı</small></span>
        </Link>
        <nav aria-label="Ana menü">
          {NAV.map((n) => {
            const count = n.badge === 'unread' ? unread : n.badge === 'favs' ? favNews : 0;
            return (
              <Link key={n.href} href={n.href} aria-current={n.match(path) ? 'true' : undefined}>
                {n.label}{count > 0 ? <span className="nb" aria-label={`${count} yeni`}>{count}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="user">
          {!authReady ? null : profile ? (
            <>
              <span className="who">{label}</span>
              <button className="btn ghost sm" type="button" onClick={async () => { await getSupabase()?.auth.signOut(); router.push('/'); router.refresh(); }}>Çıkış</button>
            </>
          ) : (
            <Link href="/giris" className="btn sm">Giriş / Kayıt</Link>
          )}
        </div>
      </div>
    </header>
  );
}
