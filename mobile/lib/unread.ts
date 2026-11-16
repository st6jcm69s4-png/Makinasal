import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/*
 * Okunmamış mesaj sayısı: başlıktaki Mesajlar düğmesinin rozeti.
 * Tek bir sayaç uygulama genelinde paylaşılır (her ekran ayrı ayrı sorgulamasın), 30 sn'de bir yenilenir.
 */
let value = 0;
let uid = '';
let timer: ReturnType<typeof setInterval> | null = null;
const subs = new Set<(n: number) => void>();
const set = (n: number) => { value = n; subs.forEach((f) => f(n)); };

async function run() {
  if (!uid) { set(0); return; }
  const { data, error } = await supabase.rpc('unread_counts');
  set(error || !Array.isArray(data) ? 0 : (data as { n: number | string }[]).reduce((a, r) => a + Number(r.n), 0));
}

/** Oturum değişince çağrılır (sekme düzeninden). */
export function watchUnread(userId: string) {
  if (userId === uid && timer) return;
  uid = userId;
  if (timer) { clearInterval(timer); timer = null; }
  if (!uid) { set(0); return; }
  void run();
  timer = setInterval(() => void run(), 30000);
}

export function useUnread(): number {
  const [n, setN] = useState(value);
  useEffect(() => { subs.add(setN); setN(value); return () => { subs.delete(setN); }; }, []);
  return n;
}
