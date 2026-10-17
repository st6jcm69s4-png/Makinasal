'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';

const NAV: { href: string; label: string; match: (p: string) => boolean; badge?: 'unread' | 'favs' }[] = [
  { href: '/', label: 'Ana sayfa', match: p => p === '/' },
  { href: '/ilan-ver', label: 'İlan ver', match: p => p.startsWith('/ilan-ver') },
  { href: '/ilanlarim', label: 'İlanlarım', match: p => p.startsWith('/ilanlarim') },
  { href: '/mesajlar', label: 'Mesajlar', match: p => p.startsWith('/mesajlar'), badge: 'unread' },
  { href: '/is-agi/hesabim', label: 'İşlerim ve tekliflerim', match: p => p === '/is-agi/hesabim' },
  { href: '/favoriler', label: 'Favoriler', match: p => p.startsWith('/favoriler'), badge: 'favs' },
  { href: '/profil', label: 'Profil', match: p => p.startsWith('/profil') },
  { href: '/ilanlar', label: 'İlanlarda ara', match: p => p.startsWith('/ilanlar') && !p.startsWith('/ilanlarim') || p.startsWith('/karsilastir') || p.startsWith('/magaza') },
  { href: '/is-agi', label: 'İş ağı', match: p => p === '/is-agi' },
  { href: '/kiralik', label: 'Kiralık', match: p => p === '/kiralik' || p === '/operatorler' },
  { href: '/isler', label: 'İş talepleri', match: p => p === '/isler' },
  { href: '/parca-talepleri', label: 'Parça talepleri', match: p => p === '/parca-talepleri' },
  { href: '/sirketler', label: 'Şirketler ve filolar', match: p => p === '/sirketler' },
  { href: '/envanterim', label: 'Şirketim ve envanterim', match: p => p === '/envanterim' },
  { href: '/firmalar', label: 'Firmalar ve parçacılar', match: p => p.startsWith('/firmalar') },
  { href: '/premium', label: 'Üyelik', match: p => p.startsWith('/premium') },
  { href: '/guven', label: 'Güvenli alışveriş', match: p => p.startsWith('/guven') },
  { href: '/destek', label: 'Yardım', match: p => p.startsWith('/destek') },
];

export function SiteHeader() {
  const path = usePathname() ?? '/';
  const { profile, authReady, unread, favNews, toast } = useMarket();
  const menu = useRef<HTMLDetailsElement>(null);
  const label = profile ? profile.full_name || profile.email || 'Hesabım' : '';
  const close = () => { if (menu.current) menu.current.open = false; };
  useEffect(() => {
    const el = menu.current; if (!el) return;
    let previous = document.body.style.overflow;
    const toggle = () => { document.body.style.overflow = el.open ? 'hidden' : previous; };
    const keyboard = (e: KeyboardEvent) => {
      if (!el.open) return;
      if (e.key === 'Escape') { close(); el.querySelector('summary')?.focus(); }
      if (e.key === 'Tab') {
        const items = Array.from(el.querySelectorAll<HTMLElement>('summary,a[href],button:not([disabled])'));
        const first = items[0]; const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener('toggle', toggle); document.addEventListener('keydown', keyboard);
    return () => { el.removeEventListener('toggle', toggle); document.removeEventListener('keydown', keyboard); document.body.style.overflow = previous; };
  }, []);
  useEffect(close, [path]);

  return <header className="top app-header"><div className="wrap">
    <details className="site-menu" ref={menu}>
      <summary className="menu-toggle" aria-label="Menüyü aç veya kapat" aria-controls="site-drawer">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg><span>Menü</span>
        {unread + favNews > 0 ? <span className="nb">{unread + favNews}</span> : null}
      </summary>
      <a className="drawer-backdrop" href={path} tabIndex={-1} aria-label="Menüyü kapat" onClick={e => { e.preventDefault(); close(); }} />
      <aside id="site-drawer" className="site-drawer" aria-label="Gezinme menüsü">
        <div className="drawer-heading"><div><b>Makinasal</b><p>İş makinesi pazarı</p></div><a className="drawer-close" href={path} aria-label="Menüyü kapat" onClick={e => { e.preventDefault(); close(); }}>×</a></div>
        <div className="drawer-account">{profile ? <><b>{label}</b><span>Hesabını ve ilanlarını yönet</span></> : <><b>Makinasal’a hoş geldin</b><a className="btn sm" href="/giris">Giriş yap / Kayıt ol</a></>}</div>
        <nav aria-label="Ana menü">{NAV.map(n => {
          const count = n.badge === 'unread' ? unread : n.badge === 'favs' ? favNews : 0;
          // Real document links continue to work if the SPA router is unavailable.
          return <a key={n.href} href={n.href} aria-current={n.match(path) ? 'page' : undefined}><span>{n.label}</span>{count > 0 ? <span className="nb" aria-label={`${count} yeni`}>{count}</span> : null}</a>;
        })}</nav>
        {profile ? <div className="drawer-signout"><button className="btn ghost" type="button" onClick={async () => {
          const result = await getSupabase()?.auth.signOut();
          if (result?.error) { toast('Çıkış yapılamadı. Tekrar dene.'); return; }
          window.location.assign('/');
        }}>Çıkış yap</button></div> : null}
      </aside>
    </details>
    <a href="/" className="logo" aria-label="Makinasal ana sayfa"><svg className="gear" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></svg><span>Makinasal<small>İş makinesi pazarı</small></span></a>
    <div className="header-actions"><a className="btn sm" href="/ilan-ver">İlan ver</a>{authReady && profile ? <a className="header-account" href="/profil">Hesabım</a> : <a className="header-account" href="/giris">Giriş yap</a>}</div>
  </div></header>;
}
