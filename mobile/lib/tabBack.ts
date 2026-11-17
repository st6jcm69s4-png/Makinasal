import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';

/*
 * Sekmeler arası "geri".
 * Uygulama içindeki bir bağlantı başka bir sekmeyi açtığında (ör. Ana sayfa → "Tümü" → İlanlar) açılan sekmenin
 * sol üstünde geldiğin sekmeye döndüren geri düğmesi çıkar. Alttaki çubuktan ya da kaydırarak geçişte çıkmaz.
 */
export const TAB_PATH: Record<string, string> = { index: '/', ilanlar: '/ilanlar', yeni: '/yeni', 'is-agi': '/is-agi', hesap: '/hesap' };
const TAB_OF: Record<string, string> = Object.fromEntries(Object.entries(TAB_PATH).map(([k, v]) => [v, k]));

let current = 'index';
let pending: string | null = null;
const backTo: Record<string, string | null> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

const pathOf = (href: Href): string => {
  const p = typeof href === 'string' ? href : (href as { pathname?: string }).pathname ?? '';
  return p.split('?')[0] || '/';
};

/**
 * Bir sekme ekrana geldiğinde çağrılır (SwipeTabs). Başka sekmeden bağlantısız (alt çubuk, kaydırma) gelindiyse
 * geri hedefi silinir. Aynı sekmeye bir iç sayfadan dönülünce (ör. ilan → geri) hedef korunur.
 */
export function tabFocused(tab: string) {
  if (tab !== current && pending !== tab) backTo[tab] = null;
  pending = null;
  current = tab;
  emit();
}

/** Uygulama içinden bir sayfaya git; hedef bir sekmeyse geri hedefi olarak şimdiki sekme hatırlanır. */
export function openTab(href: Href) {
  const tab = TAB_OF[pathOf(href)];
  if (tab && tab !== current) { backTo[tab] = current; pending = tab; emit(); }
  router.navigate(href);
}

/** Sekmenin geri hedefi (yoksa null). */
export function useTabBack(tab: string): string | null {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return backTo[tab] ?? null;
}

export function goBackTab(tab: string) {
  const to = backTo[tab];
  if (!to) return;
  backTo[tab] = null;
  pending = to; // dönülen sekmenin kendi geri hedefi korunur (zincir: Ana sayfa → İlanlar → İş Ağı)
  emit();
  router.navigate(TAB_PATH[to] as Href);
}
