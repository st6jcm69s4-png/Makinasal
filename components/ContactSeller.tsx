'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export function ContactSeller({ listingId, sellerId }: { listingId: string; sellerId: string }) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    supabase.auth.getUser().then(({ data }) => { setUid(data.user?.id ?? null); setReady(true); });
  }, []);

  async function start() {
    const supabase = getSupabase();
    if (!supabase || !uid) return;
    setBusy(true);
    setError('');
    try {
      const { data: existing } = await supabase
        .from('threads').select('id').eq('listing_id', listingId).eq('buyer_id', uid).maybeSingle();
      let id = existing?.id as string | undefined;
      if (!id) {
        const { data, error: insErr } = await supabase
          .from('threads').insert({ listing_id: listingId, buyer_id: uid, seller_id: sellerId }).select('id').single();
        if (insErr || !data) throw new Error(insErr?.message ?? 'Konuşma başlatılamadı');
        id = data.id as string;
      }
      router.push(`/mesajlar/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu.');
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!uid) return <p><Link className="btn" href="/giris">Satıcıya yazmak için giriş yap</Link></p>;
  if (uid === sellerId) return <p className="meta">Bu senin ilanın. Gelen mesajlar <Link href="/mesajlar"><b>Mesajlar</b></Link> sayfasında.</p>;
  return (
    <>
      <p><button className="btn" type="button" onClick={start} disabled={busy}>{busy ? 'Açılıyor…' : 'Satıcıya yaz'}</button></p>
      {error ? <div className="alert low" role="alert">{error}</div> : null}
      <p className="meta">Ürünü görmeden kapora veya ön ödeme gönderme.</p>
    </>
  );
}
