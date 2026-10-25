'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';

type Row = { inviter_id: string; invitee_id: string; status: 'pending' | 'rewarded' };

export function ReferralPanel() {
  const { t: tr } = useLanguage();
  const { profile, toast } = useMarket();
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const me = profile?.id;

  async function load() {
    const supabase = getSupabase();
    if (!supabase || !me) return;
    const [c, r] = await Promise.all([supabase.rpc('my_referral_code'), supabase.from('referrals').select('inviter_id,invitee_id,status')]);
    if (typeof c.data === 'string') setCode(c.data);
    if (r.data) setRows(r.data as Row[]);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [me]);

  if (!me) return null;
  const invited = rows.filter((r) => r.inviter_id === me);
  const rewarded = invited.filter((r) => r.status === 'rewarded').length;
  const used = rows.some((r) => r.invitee_id === me);

  async function claim() {
    const supabase = getSupabase();
    if (!supabase || !input.trim()) return;
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('claim_referral', { p_code: input });
    setBusy(false);
    if (error) { setMsg(/RATE_LIMIT/.test(error.message) ? tr('Çok fazla deneme. Daha sonra tekrar dene.') : error.message); return; }
    toast(tr('Davet kodu kaydedildi.')); setInput(''); void load();
  }

  return (
    <div className="panel">
      <h2>{tr('Davet et, ilan hakkı kazan')}</h2>
      <p className="sub">{tr('Davet ettiğin kişinin ilk ilanı onaylanınca +1 ilan hakkı kazanırsın (en fazla 3).')}</p>
      <p style={{ marginTop: 10 }}>{tr('Davet kodun:')} <b>{code || '…'}</b></p>
      <p className="sub">{tr('Davet edilen')}: {invited.length} · {tr('Kazanılan hak')}: {Math.min(rewarded, 3)}</p>
      {!used ? (
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="refIn">{tr('Bir davet kodun var mı?')}</label>
          <input id="refIn" value={input} maxLength={16} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
          {msg ? <span className="sub" role="alert">{msg}</span> : null}
          <div><button className="btn ghost" type="button" disabled={busy} onClick={() => void claim()}>{tr('Kodu kullan')}</button></div>
        </div>
      ) : null}
    </div>
  );
}
