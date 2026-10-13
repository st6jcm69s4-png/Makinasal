'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export function UserMenu() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    const show = (u: { email?: string | null; user_metadata?: { full_name?: string } } | null | undefined) =>
      setLabel(u ? u.user_metadata?.full_name || u.email || 'Hesabım' : null);
    supabase.auth.getUser().then(({ data }) => { show(data.user); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => show(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <span className="demo">…</span>;
  if (!label) return <Link href="/giris" className="btn">Giriş / Kayıt</Link>;
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span className="meta" style={{ margin: 0 }}>{label}</span>
      <button className="btn ghost" type="button" onClick={async () => { await getSupabase()?.auth.signOut(); router.refresh(); }}>
        Çıkış
      </button>
    </span>
  );
}
