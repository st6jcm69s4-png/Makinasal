'use client';
import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';

const KINDS = [
  { id: 'finans', label: 'Finansman teklifi iste', machineOnly: true },
  { id: 'ekspertiz', label: 'Ekspertiz talep et', machineOnly: true },
  { id: 'nakliye', label: 'Nakliye teklifi iste', machineOnly: false },
] as const;

export function ServiceRequestBox({ listingId, city, part }: { listingId: string; city: string; part: boolean }) {
  const { t: tr } = useLanguage();
  const { profile, toast } = useMarket();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const kinds = KINDS.filter((k) => !part || !k.machineOnly);

  async function send() {
    const supabase = getSupabase();
    if (!supabase || !profile) { setErr(tr('Talep göndermek için giriş yapmalısın.')); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.from('service_requests').insert({ listing_id: listingId, kind: open, note: note.trim() || null, city });
    setBusy(false);
    if (error) {
      setErr(/duplicate|unique/i.test(error.message) ? tr('Bu talebi zaten gönderdin.') : /RATE_LIMIT/.test(error.message) ? tr('Çok fazla işlem. Bir dakika sonra tekrar dene.') : tr('Talep gönderilemedi. Daha sonra tekrar dene.'));
      return;
    }
    toast(tr('Talebin alındı. Makinasal ekibi seninle iletişime geçecek.'));
    setOpen(null); setNote('');
  }

  return (
    <div className="panel">
      <h3>{tr('Ek hizmetler')}</h3>
      <div className="acts-row" style={{ marginTop: 10 }}>
        {kinds.map((k) => (
          <button key={k.id} className="btn ghost" type="button" aria-expanded={open === k.id} onClick={() => { setOpen(open === k.id ? null : k.id); setErr(''); }}>{tr(k.label)}</button>
        ))}
      </div>
      {open ? (
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="srNote">{tr('Not (isteğe bağlı)')}</label>
          <textarea id="srNote" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          {err ? <span className="sub" role="alert">{err}</span> : null}
          <div><button className="btn" type="button" disabled={busy} onClick={() => void send()}>{tr('Talebi gönder')}</button></div>
          <span className="sub">{tr('Talebin yalnızca Makinasal ekibine iletilir; henüz anlaşmalı bir firma yoktur, ekip seninle profilindeki iletişim bilgisiyle görüşür. Bu bir teklif veya taahhüt değildir.')}</span>
        </div>
      ) : null}
    </div>
  );
}
