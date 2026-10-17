'use client';

import { useEffect, useState } from 'react';
import { CITIES, LIMITS } from '@/lib/data/constants';
import type { Review, Seller } from '@/lib/data/types';
import { fetchReviews, loadSellers } from '@/lib/dbListings';
import { getSupabase } from '@/lib/supabase/client';
import { trustLevel } from '@/lib/trust';
import { MyListings } from './MyListings';
import { useMarket } from './MarketProvider';
import { Avatar, Pill, ScoreRow, Stars, toneClass } from './ui';

export function ProfileView() {
  const { profile, authReady, reloadProfile, reload, toast } = useMarket();
  const [me, setMe] = useState<Seller | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [store, setStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name); setStore(profile.is_store); setStoreName(profile.store_name); setCity(profile.city);
    const supabase = getSupabase();
    if (!supabase) return;
    void loadSellers(supabase, [profile.id]).then((m) => setMe(m[profile.id] ?? null));
    void fetchReviews(supabase, profile.id).then(setReviews);
    void supabase.rpc('my_phone').then(({ data }) => setPhone((data as string | null) ?? ''));
  }, [profile]);

  if (!authReady) return <div className="empty">Yükleniyor…</div>;
  if (!profile) return (
    <>
      <h1>Profil</h1>
      <div className="panel" style={{ marginTop: 16 }}>Profilini görmek için <a className="linkbtn" href="/giris">giriş yap</a>.</div>
    </>
  );

  async function save() {
    const supabase = getSupabase();
    if (!supabase || !profile) return;
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    if (cleanPhone && !/^(\+90|0)?5\d{9}$/.test(cleanPhone)) { setErr('Telefon numarasını 05XX XXX XX XX biçiminde yaz.'); return; }
    if (store && !storeName.trim()) { setErr('Kurumsal üyelikte firma adı gerekli.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.from('profiles').update({
      full_name: name.trim(), city: city || null, is_store: store, store_name: store ? storeName.trim() : null, phone: cleanPhone || null,
    }).eq('id', profile!.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    toast('Bilgilerin kaydedildi.');
    await reloadProfile();
    void reload();
  }

  const display = (profile.is_store && profile.store_name) || profile.full_name || profile.email || 'Üye';
  const seller: Seller = me ?? { name: display, type: profile.is_store ? 'Kurumsal' : 'Bireysel', ver: false, s: null, b: null, deals: 0, rep: 0, city: profile.city, since: new Date(profile.created_at).getFullYear(), reviews: [] };
  const lv = trustLevel(seller);
  const ver: [string, string, boolean][] = [
    ['Telefon numarası', 'Numaran kayıtlı. SMS koduyla doğrulama altyapısı sonraki aşamada açılacak.', profile.verified_phone],
    ['Kimlik', 'T.C. kimlik ve selfie ile doğrulama sonraki aşamada açılacak.', profile.verified_id],
  ];
  if (profile.is_store) ver.push(['Vergi levhası', 'Şirket adıyla eşleştirme sonraki aşamada açılacak.', profile.verified_tax]);

  return (
    <>
      <h1>Profil</h1>
      <p className="lead">Bilgilerini, doğrulamalarını, aldığın değerlendirmeleri ve ilanlarını buradan yönet.</p>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="panel">
          <div className="prof-head">
            <Avatar name={display} />
            <div style={{ minWidth: 0 }}>
              <h2>{display}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <Pill cls={toneClass(lv.tone)}>{lv.label}</Pill>
                {seller.ver ? <Pill cls="good">Doğrulanmış</Pill> : <Pill>Doğrulanmadı</Pill>}
                {profile.is_premium ? <Pill cls="prem">Premium</Pill> : null}
                <Pill>{seller.type}</Pill>
              </div>
            </div>
            <a className="btn ghost sm" style={{ marginLeft: 'auto' }} href={`/magaza/${profile.id}`}>Herkese açık sayfamı gör</a>
          </div>
        </div>
        <div className="two">
          <div className="panel">
            <h3>Bilgilerim</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <div className="field"><label htmlFor="p-name">Ad soyad</label><input type="text" id="p-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
              <div className="field"><label htmlFor="p-type">Üyelik türü</label>
                <select id="p-type" value={store ? 'k' : 'b'} onChange={(e) => setStore(e.target.value === 'k')}><option value="b">Bireysel</option><option value="k">Kurumsal (mağaza)</option></select></div>
              {store ? <div className="field"><label htmlFor="p-store">Firma / mağaza adı</label><input type="text" id="p-store" value={storeName} maxLength={80} onChange={(e) => setStoreName(e.target.value)} /></div> : null}
              <div className="field"><label htmlFor="p-city">Şehir (mesafe hesabında konumun olarak kullanılır)</label>
                <select id="p-city" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Seçilmedi</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label htmlFor="p-phone">Telefon (yalnızca giriş yapmış alıcılar &quot;Telefonu göster&quot; deyince görür)</label>
                <input type="text" id="p-phone" inputMode="tel" value={phone} placeholder="05XX XXX XX XX" onChange={(e) => setPhone(e.target.value)} /></div>
              {err ? <div className="err" role="alert">{err}</div> : null}
              <div><button className="btn" type="button" disabled={busy} onClick={() => void save()}>Kaydet</button></div>
            </div>
          </div>
          <div className="panel">
            <h3>Doğrulama</h3>
            <p className="sub" style={{ margin: '4px 0 4px' }}>Doğrulanmış üyeler listede rozetle gösterilir. Rozet kendi kendine verilemez.</p>
            {ver.map(([t, d, ok]) => (
              <div key={t} className="mine"><div><b>{t}</b><br /><span className="sub">{d}</span></div>{ok ? <Pill cls="good">Doğrulandı</Pill> : <Pill>Bekliyor</Pill>}</div>
            ))}
          </div>
        </div>
        <div className="two">
          <div className="panel">
            <h3>Puanlarım</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <ScoreRow label="Satıcı puanı" value={seller.s} />
              <ScoreRow label="Alıcı puanı" value={seller.b} />
              <div className="sub">Puan, ilk 3 onaylı işlemden sonra seviyene yansır. Şu an {seller.deals} işlemin var.</div>
            </div>
          </div>
          <div className={`panel${profile.is_premium ? ' prem' : ''}`}>
            <h3>Üyelik</h3>
            <p style={{ margin: '10px 0 12px' }}>{profile.is_premium ? 'Premium üyesin. 30 aktif ilan, 20 fotoğraf ve öne çıkma özelliklerin açık.' : `Ücretsiz üyesin. ${LIMITS.free.listings} aktif ilan ve ilan başına ${LIMITS.free.photos} fotoğraf ekleyebilirsin.`}</p>
            <a className={`btn${profile.is_premium ? ' ghost' : ''}`} href="/premium">{profile.is_premium ? 'Üyeliği yönet' : 'Premium özelliklerini gör'}</a>
          </div>
        </div>
        <div className="panel">
          <h3>Aldığım değerlendirmeler</h3>
          <div style={{ marginTop: 6 }}>
            {reviews.length === 0 ? <div className="empty">Henüz değerlendirme almadın. İlk işlemden sonra burada görünür.</div> : reviews.map((r, i) => (
              <div key={i} className="rv">
                <div className="acts-row" style={{ justifyContent: 'space-between' }}><b>{r.who} <span className="sub">({r.role})</span></b><span><Stars n={r.rating} /> <span className="sub">{r.date}</span></span></div>
                <div>{r.text}</div>
                {r.tags.length ? <div className="tags" style={{ marginTop: 6 }}>{r.tags.map((x) => <Pill key={x}>{x}</Pill>)}</div> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="sect-h" style={{ marginBottom: 0 }}><h3>İlanlarım</h3><a className="btn sm" href="/ilan-ver">Yeni ilan ver</a></div>
          <div style={{ marginTop: 6 }}><MyListings /></div>
        </div>
      </div>
    </>
  );
}
