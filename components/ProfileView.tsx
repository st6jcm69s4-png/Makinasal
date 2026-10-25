'use client';
import { ReferralPanel } from './ReferralPanel';
import { useLanguage } from "@/components/LanguageProvider";


import { useEffect, useState } from 'react';
import { LIMITS } from '@/lib/data/constants';
import type { Review, Seller } from '@/lib/data/types';
import { fetchReviews, loadSellers } from '@/lib/dbListings';
import { getSupabase } from '@/lib/supabase/client';
import { trustLevel } from '@/lib/trust';
import { capitalizeName, formatPersonName, validRegion } from '@/lib/profile';
import { RegionFields } from './RegionFields';
import { MyListings } from './MyListings';
import { useMarket } from './MarketProvider';
import { Avatar, Pill, ScoreRow, Stars, toneClass } from './ui';

export function ProfileView() {
  const { t: tr, language } = useLanguage();

  const { profile, authReady, reloadProfile, reload, toast } = useMarket();
  const [me, setMe] = useState<Seller | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [store, setStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [bio, setBio] = useState('');
  const [companyBio, setCompanyBio] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(formatPersonName(profile.full_name)); setDistrict(profile.district); setBio(profile.bio); setCompanyBio(profile.company_bio); setStore(profile.is_store); setStoreName(profile.store_name); setCity(profile.city);
    const supabase = getSupabase();
    if (!supabase) return;
    void loadSellers(supabase, [profile.id]).then((m) => setMe(m[profile.id] ?? null));
    void fetchReviews(supabase, profile.id).then(setReviews);
    void supabase.rpc('my_phone').then(({ data }) => setPhone((data as string | null) ?? ''));
  }, [profile]);

  if (!authReady) return <div className="empty">{tr("Yükleniyor…")}</div>;
  if (!profile) return (
    <>
      <h1>{tr("Profil")}</h1>
      <div className="panel" style={{ marginTop: 16 }}>{tr("Profilini görmek için ")}<a className="linkbtn" href="/giris">{tr("giriş yap")}</a>.</div>
    </>
  );

  async function save() {
    const supabase = getSupabase();
    if (!supabase || !profile) return;
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    if (cleanPhone && !/^(\+90|0)?5\d{9}$/.test(cleanPhone)) { setErr("Telefon numarasını 05XX XXX XX XX biçiminde yaz."); return; }
    if (store && !storeName.trim()) { setErr("Kurumsal üyelikte firma adı gerekli."); return; }
    if (formatPersonName(name).length < 2) { setErr("Ad soyadını en az 2 karakter olarak gir."); return; }
    if (!validRegion(city, district)) { setErr("İl ve ilçe seçimini kontrol et."); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.from('profiles').update({
      full_name: formatPersonName(name), city: city || null, district, bio: bio.trim(), company_bio: companyBio.trim(), is_store: store, store_name: store ? storeName.trim() : null, phone: cleanPhone || null,
    }).eq('id', profile!.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    toast("Bilgilerin kaydedildi.");
    await reloadProfile();
    void reload();
  }

  const display = (profile.is_store && profile.store_name) || profile.full_name || profile.email || 'Üye';
  const seller: Seller = me ?? { name: display, type: profile.is_store ? 'Kurumsal' : 'Bireysel', ver: false, s: null, b: null, deals: 0, rep: 0, city: profile.city, since: new Date(profile.created_at).getFullYear(), reviews: [] };
  const lv = trustLevel(seller);
  const ver: [string, string, boolean][] = [
    ['Telefon numarası', 'E-posta ve telefon doğrulamalarını hesap güvenliği sayfasından yönet.', profile.verified_phone],
    ['Kimlik', 'T.C. kimlik ve selfie ile doğrulama sonraki aşamada açılacak.', profile.verified_id],
  ];
  if (profile.is_store) ver.push(['Vergi levhası', 'Şirket adıyla eşleştirme sonraki aşamada açılacak.', profile.verified_tax]);

  return (
    <>
      <h1>{tr("Profil")}</h1>
      <p className="lead">{tr("Bilgilerini, doğrulamalarını, aldığın değerlendirmeleri ve ilanlarını buradan yönet.")}</p>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="panel">
          <div className="prof-head">
            <Avatar name={display} />
            <div style={{ minWidth: 0 }}>
              <h2>{display}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <Pill cls={toneClass(lv.tone)}>{tr(lv.label)}</Pill>
                {seller.ver ? <Pill cls="good">{tr("Doğrulanmış")}</Pill> : <Pill>{tr("Doğrulanmadı")}</Pill>}
                {profile.is_premium ? <Pill cls="prem">{tr("Premium")}</Pill> : null}
                <Pill>{tr(seller.type)}</Pill>
              </div>
            </div>
            <a className="btn ghost sm" style={{ marginLeft: 'auto' }} href={`/magaza/${profile.id}`}>{tr("Herkese açık sayfamı gör")}</a>
          </div>
        </div>
        <div className="two">
          <div className="panel">
            <h3>{tr("Bilgilerim")}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <div className="field"><label htmlFor="p-name">{tr("Ad soyad")}</label><input type="text" id="p-name" value={name} maxLength={80} onChange={(e) => setName(capitalizeName(e.target.value))} onBlur={() => setName(formatPersonName(name))} autoCapitalize="words" /></div>
              <div className="field"><label htmlFor="p-type">{tr("Üyelik türü")}</label>
                <select id="p-type" value={store ? 'k' : 'b'} onChange={(e) => setStore(e.target.value === 'k')}><option value="b">{tr("Bireysel")}</option><option value="k">{tr("Kurumsal (mağaza)")}</option></select></div>
              {store ? <div className="field"><label htmlFor="p-store">{tr("Firma / mağaza adı")}</label><input type="text" id="p-store" value={storeName} maxLength={80} onChange={(e) => setStoreName(e.target.value)} /></div> : null}
              <RegionFields city={city} district={district} onChange={r => { setCity(r.city); setDistrict(r.district); }} />
              <div className="field"><label htmlFor="p-bio">{tr("Hakkımda")}</label><textarea id="p-bio" value={bio} maxLength={500} rows={3} onChange={e => setBio(e.target.value)} placeholder={tr("Kendini, deneyimini ve çalıştığın alanları kısaca anlat.")} /><small className="sub">{bio.length}{tr("/500 · Herkese açık profilinde görünür.")}</small></div>
              {store && <div className="field"><label htmlFor="p-company-bio">{tr("Şirket açıklaması")}</label><textarea id="p-company-bio" value={companyBio} maxLength={1000} rows={4} onChange={e => setCompanyBio(e.target.value)} placeholder={tr("Örn. Ankara ve çevresinde temel kazısı, hafriyat ve moloz nakliyesi yapıyoruz.")} /><small className="sub">{companyBio.length}{tr("/1000 · İş alanlarını ve hizmet verdiğin bölgeleri belirt.")}</small><a className="linkbtn" href="/firma-kaydi">{tr("Şirketin hizmet alanlarını ve bölgelerini düzenle →")}</a></div>}
              <div className="field"><label htmlFor="p-phone">{tr("Telefon (yalnızca giriş yapmış alıcılar \"Telefonu göster\" deyince görür)")}</label>
                <input type="text" id="p-phone" inputMode="tel" value={phone} placeholder={tr("05XX XXX XX XX")} onChange={(e) => setPhone(e.target.value)} /></div>
              {err ? <div className="err" role="alert">{tr(err)}</div> : null}
              <div><button className="btn" type="button" disabled={busy} onClick={() => void save()}>{tr("Kaydet")}</button></div>
            </div>
          </div>
          <div className="panel">
            <h3>{tr("Doğrulama")}</h3><p><a className="btn ghost sm" href="/hesap-dogrula">{tr("E-posta ve telefonu doğrula")}</a></p>
            <p className="sub" style={{ margin: '4px 0 4px' }}>{tr("Doğrulanmış üyeler listede rozetle gösterilir. Rozet kendi kendine verilemez.")}</p>
            {ver.map(([t, d, ok]) => (
              <div key={t} className="mine"><div><b>{tr(t)}</b><br /><span className="sub">{tr(d)}</span></div>{ok ? <Pill cls="good">{tr("Doğrulandı")}</Pill> : <Pill>{tr("Bekliyor")}</Pill>}</div>
            ))}
          </div>
        </div>
        <div className="two">
          <div className="panel">
            <h3>{tr("Puanlarım")}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <ScoreRow label={tr("Satıcı puanı")} value={seller.s} />
              <ScoreRow label={tr("Alıcı puanı")} value={seller.b} />
              <div className="sub">{tr("Puan, ilk 3 onaylı işlemden sonra seviyene yansır. Şu an ")}{seller.deals} {tr(" işlemin var.")}</div>
            </div>
          </div>
          <div className={`panel${profile.is_premium ? ' prem' : ''}`}>
            <h3>{tr("Üyelik")}</h3>
            <p style={{ margin: '10px 0 12px' }}>{profile.is_premium ? tr("Premium üyesin. 30 aktif ilan, 20 fotoğraf ve öne çıkma özelliklerin açık.") : tr("Ücretsiz üyesin. {0} aktif ilan ve ilan başına {1} fotoğraf ekleyebilirsin.", {"0":LIMITS.free.listings,"1":LIMITS.free.photos})}</p>
            <a className={`btn${profile.is_premium ? ' ghost' : ''}`} href="/premium">{profile.is_premium ? tr("Üyeliği yönet") : tr("Premium özelliklerini gör")}</a>
          </div>
        </div>
        <div className="panel">
          <h3>{tr("Aldığım değerlendirmeler")}</h3>
          <div style={{ marginTop: 6 }}>
            {reviews.length === 0 ? <div className="empty">{tr("Henüz değerlendirme almadın. İlk işlemden sonra burada görünür.")}</div> : reviews.map((r, i) => (
              <div key={i} className="rv">
                <div className="acts-row" style={{ justifyContent: 'space-between' }}><b>{r.who} <span className="sub">({r.role})</span></b><span><Stars n={r.rating} /> <span className="sub">{r.date}</span></span></div>
                <div>{r.text}</div>
                {r.tags.length ? <div className="tags" style={{ marginTop: 6 }}>{r.tags.map((x) => <Pill key={x}>{x}</Pill>)}</div> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="sect-h" style={{ marginBottom: 0 }}><h3>{tr("İlanlarım")}</h3><a className="btn sm" href="/ilan-ver">{tr("Yeni ilan ver")}</a></div>
          <div style={{ marginTop: 6 }}><MyListings key={profile.id} /></div>
        </div>
        <ReferralPanel />
      </div>
    </>
  );
}
