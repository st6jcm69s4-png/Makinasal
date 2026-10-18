'use client';
import { useLanguage } from "@/components/LanguageProvider";


import { partGroupLabel } from '@/lib/parts';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Listing, Seller } from '@/lib/data/types';
import { fetchListingById } from '@/lib/dbListings';
import { formatNum, formatTL } from '@/lib/format';
import { distanceLabel } from '@/lib/geo';
import { cardTitle, dropPct, listingKey, listingTitle, usageLabel } from '@/lib/listing';
import { checklistFor, priceIndicator } from '@/lib/market';
import { checkMessage } from '@/lib/messageFilter';
import { isPartCategory } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase/client';
import { trustLevel } from '@/lib/trust';
import { useMarket } from './MarketProvider';
import { IconCmp, IconFav, Pill, ScoreRow, toneClass } from './ui';

const REPORT_REASONS = ['Sahte veya yanıltıcı ilan', 'Kapora / ön ödeme istiyor', 'Fiyat gerçek dışı', 'Hakaret veya taciz', 'Diğer'];
const r1000 = (n: number) => Math.round(n / 1000) * 1000;

export function ListingDetail({ id, initial = null }: { id: string; initial?: { listing: Listing; seller: Seller | null } | null }) {
  const { t: tr, language } = useLanguage();

  const { find, sellers, stats, ready, favs, toggleFav, cmp, toggleCmp, myCity, profile } = useMarket();
  const [extra, setExtra] = useState<{ listing: Listing; seller: Seller | null } | null>(initial);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const fromPool = find(id);

  // Havuzda olmayan (satıldı/duraklatıldı) gerçek ilanı doğrudan çek; satıcı yorumlarını da getir
  useEffect(() => {
    if (!ready || /^\d+$/.test(id)) return;
    let alive = true;
    setMissing(false); setLoadError('');
    fetchListingById(getSupabase(), id).then((r) => { if (!alive) return; if (r) setExtra(r); else if (!fromPool) setMissing(true); })
      .catch(() => { if (alive) setLoadError('İlan yüklenemedi. Bağlantını kontrol edip tekrar dene.'); });
    return () => { alive = false; };
  }, [id, ready, fromPool, attempt,profile?.id]);

  useEffect(() => {
    if (!/^\d+$/.test(id)) void getSupabase()?.rpc('track_view', { p_listing: id });
  }, [id,profile?.id]);

  const current = extra?.listing.id === id ? extra : null;
  const l = current?.listing ?? fromPool;
  const m = (l && (current?.seller ?? sellers[l.sel])) || null;
  if (loadError && !l) return <div className="panel" role="alert">{tr(loadError)} <button className="btn" onClick={() => setAttempt(n => n + 1)}>{tr("Tekrar dene")}</button></div>;
  if ((!ready || (!/^\d+$/.test(id) && !missing)) && !l) return <div className="empty">{tr("Yükleniyor…")}</div>;
  if (!l || !m) return missing || ready ? <div className="empty">{tr("Bu ilan bulunamadı. ")}<a className="linkbtn" href="/ilanlar">{tr("İlanlara dön")}</a></div> : <div className="empty">{tr("Yükleniyor…")}</div>;

  const seller: Seller = { ...m, reviews: current?.seller?.reviews ?? m.reviews };
  const own = !!profile && l.sel === profile.id;
  return <Body key={l.id} l={l} seller={seller} own={own} stats={stats} favs={favs} toggleFav={toggleFav} cmp={cmp} toggleCmp={toggleCmp} myCity={myCity} />;
}

type BodyProps = {
  l: Listing; seller: Seller; own: boolean; stats: ReturnType<typeof useMarket>['stats']; favs: Record<string, number>;
  toggleFav: (l: Listing) => Promise<void>; cmp: string[]; toggleCmp: (l: Listing) => void; myCity: string;
};

function Body({ l, seller: m, own, stats, favs, toggleFav, cmp, toggleCmp, myCity }: BodyProps) {
  const { t: tr, language } = useLanguage();

  const [gi, setGi] = useState(0);
  const lv = trustLevel(m);
  const part = isPartCategory(l.cat);
  const flag = stats.flag(l.price, l.cat);
  const med = stats.median(l.cat, 2);
  const ind = priceIndicator(l, stats);
  const d = distanceLabel(myCity, l.city);
  const key = listingKey(l);
  const photos = l.photos ?? [];
  const inactive = l.status && l.status !== 'active';

  const rows: [string, ReactNode][] = [];
  if (part) {
    rows.push([l.cat === 'Yedek parça' ? 'Parça numarası' : 'Ebat', l.spec ?? '–'], ['Durum', l.cond ?? '–'], ['Uyumlu', l.compat || '–'], ['Adet', l.qty ? formatNum(l.qty, language) : '–']);
  } else {
    if (l.year) rows.push(['Model yılı', String(l.year)]);
    if (usageLabel(l, language)) rows.push(['Kullanım', usageLabel(l, language)]);
    rows.push(['Seri / şasi no', l.serial ? <Pill cls="good">{tr("Beyan edildi")}</Pill> : <Pill>{tr("Beyan yok")}</Pill>]);
  }
  rows.push(['Konum', l.city + (d ? ` (${d})` : '')], ['Takas', l.takas ? <Pill cls="good">{tr("Kabul edilir")}</Pill> : 'Belirtilmedi'],
    ['İlan durumu', l.isNew ? 'Yeni yayınlandı' : l.conf === 0 ? 'Satıcı bugün doğruladı' : `Satıcı ${l.conf} gün önce "hâlâ satılık" dedi`]);

  return (
    <>
      <a href="/ilanlar" className="back">{tr("← İlanlara dön")}</a>
      <div className="sh-head" style={{ marginBottom: 14 }}>
        <div>
          <span className="sub">{tr(l.cat)}{l.demo ? tr(" · Demo ilan") : ''}</span>
          <h1 style={{ fontSize: 34 }}>{cardTitle(l)}</h1>
          <div className="price" style={{ fontSize: 34, marginTop: 6 }}>{formatTL(l.price, language)}{part ? <span className="sub" style={{ font: '400 15px var(--f-body)' }}> {tr(" / adet")}</span> : null}</div>
          {dropPct(l) ? <div className="sub">{tr("Önceki fiyat ")}{formatTL(l.prev!, language)} · <b>−%{dropPct(l)}</b></div> : null}
        </div>
        <div className="acts-row">
          <button type="button" className="ibtn fav" aria-pressed={key in favs} aria-label={tr("Favorilere ekle veya çıkar")} onClick={() => void toggleFav(l)}><IconFav /></button>
          <button type="button" className="ibtn" aria-pressed={cmp.includes(key)} aria-label={tr("Karşılaştırmaya ekle veya çıkar")} onClick={() => toggleCmp(l)}><IconCmp /></button>
        </div>
      </div>

      {own&&l.moderation&&l.moderation!=='approved'?<p className="note" role="status">{tr(l.moderation==='pending'?'İlan inceleme bekliyor. Onaylanana kadar yalnızca sen ve moderatörler görebilir.':'İlan onaylanmadı. Bilgileri düzenleyerek yeniden incelemeye gönderebilirsin.')}</p>:null}
      {inactive ? <div className="note bad" style={{ marginBottom: 14 }}>{tr("Bu ilan ")}{l.status === 'sold' ? tr("satıldı") : tr("şu an yayında değil")}.</div> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {photos.length > 0 ? (
          <div>
            <div className="gal-main">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photos[gi] ?? photos[0]} alt={listingTitle(l)} /></div>
            {photos.length > 1 ? (
              <div className="gal-th">
                {photos.map((p, i) => (
                  <button key={p} type="button" aria-pressed={i === gi} aria-label={tr("Fotoğraf {0}", {"0":i + 1})} onClick={() => setGi(i)}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p} alt="" /></button>
                ))}
              </div>
            ) : null}
          </div>
        ) : <div className="empty">{tr("Bu ilanda fotoğraf yok. Fotoğrafsız ilanlara dikkat et.")}</div>}

        {flag === 'low' && med ? <div className="note bad"><b>{tr("Fiyat piyasanın çok altında.")}</b> {tr(" Bu kategorideki ilanların ortancası ")}{formatTL(r1000(med), language)}{tr(". Çok düşük fiyat ve acele ettirme, kapora dolandırıcılığında sık görülen işaretlerdir.")}</div> : null}
        {flag === 'high' && med ? <div className="note">{tr("Fiyat kategori ortancası olan ")}{formatTL(r1000(med), language)} {tr(" seviyesinin belirgin üstünde. Pazarlık payını sor.")}</div> : null}
        {lv.label === 'Riskli' ? <div className="note bad"><b>{tr("Bu satıcı riskli seviyede.")}</b> {m.rep} {tr(" doğrulanmış şikayet var. Bu satıcıyla işlem yapmadan önce ürünü yerinde gör ve belgeleri kontrol et.")}</div> : null}
        {lv.label === 'Yeni üye' ? <div className="note">{tr("Bu üyenin henüz yeterli onaylı işlemi yok, puanı oluşmadı. Ürünü yerinde görmeden ödeme yapma.")}</div> : null}

        <PriceBox ind={ind} l={l} />

        <div className="two">
          <div className="panel">
            <h3>{part ? tr("Ürün bilgisi") : tr("Makine bilgisi")}</h3>
            <table><tbody>{rows.map(([k, v]) => <tr key={k}><th>{tr(k)}</th><td>{["İlan durumu", "Takas", "Durum"].includes(k) && typeof v === "string" ? tr(v) : v}</td></tr>)}</tbody></table>
            {l.equipmentCategory && <p className="sub">{l.equipmentCategory} · {tr(partGroupLabel(l.partGroup))}</p>}{l.desc ? <p style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{l.desc}</p> : null}
          </div>
          <div className="panel">
            <h3>{tr("Satıcı")}</h3>
            <div style={{ margin: '8px 0 12px' }}><b>{m.name}</b> · <span className="sub">{tr(m.type)} · {m.city}</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <Pill cls={toneClass(lv.tone)}>{tr(lv.label)}</Pill>
              {m.ver ? <Pill cls="good">{tr("Doğrulanmış satıcı")}</Pill> : <Pill>{tr("Doğrulanmadı")}</Pill>}
              {m.prem ? <Pill cls="prem">{tr("Premium satıcı")}</Pill> : null}
            </div>
            <div className="field" style={{ gap: 10 }}>
              <ScoreRow label={tr("Satıcı puanı")} value={m.s} />
              <ScoreRow label={tr("Alıcı puanı")} value={m.b} />
              <div className="sub">{m.deals} {tr(" onaylı işlem · ")}{m.rep} {tr(" doğrulanmış şikayet · ")}{m.since}{tr("'den beri üye")}</div>
              {m.reviews.slice(0, 2).map((r, i) => (
                <div key={i} className="sub">{'★'.repeat(r.rating)} {r.text ? `“${r.text}” — ` : '— '}{r.who}</div>
              ))}
              <a className="btn ghost sm" style={{ alignSelf: 'flex-start' }} href={`/magaza/${l.sel}`}>{m.type === 'Kurumsal' ? tr("Mağaza sayfası") : tr("Satıcı sayfası")}</a>
            </div>
          </div>
        </div>

        <Checklist l={l} />

        <div className="panel">
          <h3>{tr("Güvenli alım için")}</h3>
          <ul className="clean" style={{ marginTop: 10 }}>
            <li>{tr("Ürünü görmeden kapora veya ön ödeme gönderme.")}</li>
            <li>{tr("Ruhsat, fatura ve seri/şasi numarasını makine üzerinden kontrol et.")}</li>
            <li>{tr("Ödemeyi satış sırasında yap ve işlemi noterde tamamla.")}</li>
            <li>{tr("Mesajlarda IBAN veya harici link paylaşımı engellenir. Böyle bir istek gelirse şikayet et.")}</li>
          </ul>
        </div>

        {own ? (
          <div className="note good">{tr("Bu senin ilanın. İlanı ")}<a className="linkbtn" href="/profil">{tr("Profil")}</a> {tr(" sayfasından yönetebilirsin.")}</div>
        ) : inactive ? null : <Actions l={l} part={part} />}
      </div>
    </>
  );
}

function PriceBox({ ind, l }: { ind: ReturnType<typeof priceIndicator>; l: Listing }) {
  const { t: tr, language } = useLanguage();

  if (ind.kind === 'part') return <div className="panel"><h3>{tr("Fiyat göstergesi")}</h3><p className="sub" style={{ margin: '6px 0 0' }}>{tr("Parça ve lastik fiyatları ürüne göre çok değiştiği için piyasa göstergesi gösterilmez. Aynı parça numarasını farklı satıcılarda karşılaştır.")}</p></div>;
  if (ind.kind === 'few') return <div className="panel"><h3>{tr("Fiyat göstergesi")}</h3><p className="sub" style={{ margin: '6px 0 0' }}>{tr("Bu kategoride karşılaştırma için yeterli ilan yok (")}{ind.count} {tr(" ilan).")}</p></div>;
  const clampL = (p: number) => Math.max(10, Math.min(90, p));
  const txt = Math.abs(ind.diff) < 3 ? tr('Bu ilan kategori ortancasıyla aynı seviyede.') : tr(ind.diff < 0 ? 'Bu ilan kategori ortancasının %{0} altında.' : 'Bu ilan kategori ortancasının %{0} üstünde.', {0:Math.abs(ind.diff)});
  return (
    <div className="panel">
      <h3>{tr("Fiyat göstergesi")}</h3>
      <p className="sub" style={{ margin: '4px 0 0' }}>{tr("Aynı kategorideki ")}{ind.count} {tr(" ilana göre. ")}{txt}{dropPct(l) ? tr(" Önceki fiyat {0}, %{1} indirim.", {"0":formatTL(l.prev!, language),"1":dropPct(l)}) : ''}</p>
      <div className="pbar" role="img" aria-label={tr("Fiyat aralığı: en düşük {0}, ortanca {1}, en yüksek {2}. Bu ilan {3}.", {"0":formatTL(ind.min, language),"1":formatTL(ind.median, language),"2":formatTL(ind.max, language),"3":formatTL(l.price, language)})}>
        <div className="pb-track"><span className="pb-tick" style={{ left: `${ind.medPct}%` }} /><span className="pb-me" style={{ left: `${ind.mePct}%` }} /></div>
        <span className="pb-ml" style={{ left: `${clampL(ind.mePct)}%` }}>{tr("Bu ilan")}</span>
        <span className="pb-end" style={{ left: 0 }}>{formatTL(ind.min, language)}</span>
        <span className="pb-tl" style={{ left: `${clampL(ind.medPct)}%`, top: 34 }}>{tr("Ortanca ")}{formatTL(r1000(ind.median), language)}</span>
        <span className="pb-end" style={{ right: 0 }}>{formatTL(ind.max, language)}</span>
      </div>
    </div>
  );
}

function Checklist({ l }: { l: Listing }) {
  const { t: tr, language } = useLanguage();

  const items = checklistFor(l);
  const k = `mk-chk-${l.id}`;
  const [set, setSet] = useState<Record<number, boolean>>({});
  useEffect(() => { try { setSet(JSON.parse(localStorage.getItem(k) ?? '{}')); } catch { /* yok say */ } }, [k]);
  const flip = (i: number) => {
    const next = { ...set, [i]: !set[i] };
    setSet(next);
    try { localStorage.setItem(k, JSON.stringify(next)); } catch { /* yok say */ }
  };
  const done = items.filter((_, i) => set[i]).length;
  return (
    <div className="panel">
      <h3>{tr("Yerinde inceleme listesi")}</h3>
      <p className="sub" style={{ margin: '4px 0 0' }}>{tr("Ürünü görmeye giderken işaretle. Hepsi tamamlanmadan ödeme yapma.")}</p>
      <div className="out" style={{ marginTop: 10 }}>{done} / {items.length} {tr(" tamamlandı")}</div>
      <div className="prog"><i style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></div>
      <div className="chk">
        {items.map((t, i) => <label key={i} className="check"><input type="checkbox" checked={!!set[i]} onChange={() => flip(i)} />{tr(t)}</label>)}
      </div>
    </div>
  );
}

function Actions({ l, part }: { l: Listing; part: boolean }) {
  const { t: tr, language } = useLanguage();

  const { profile, authReady, toast } = useMarket();
  const [phone, setPhone] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [takas, setTakas] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [ticket, setTicket] = useState('');
  const isDemo = typeof l.id === 'number';

  const needLogin = () => { toast("Bu işlem için giriş yapmalısın."); window.location.assign('/giris'); };

  async function reveal() {
    if (isDemo) { setPhone('0500 000 00 00 (örnek numara)'); return; }
    if (!profile) return needLogin();
    const { data, error } = await getSupabase()!.rpc('listing_phone', { p_listing: l.id });
    if (error) { setErr('Numara alınamadı: ' + error.message); return; }
    setPhone((data as string | null) || 'Satıcı henüz telefon numarası eklememiş. Mesaj göndererek ulaşabilirsin.');
  }

  async function openThread(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase || !profile) { needLogin(); return null; }
    const { data: existing } = await supabase.from('threads').select('id').eq('listing_id', l.id).eq('buyer_id', profile.id).maybeSingle();
    if (existing?.id) return existing.id as string;
    const { data, error } = await supabase.from('threads').insert({ listing_id: l.id, buyer_id: profile.id, seller_id: l.sel }).select('id').single();
    if (error || !data) { setErr(error?.message ?? 'Konuşma başlatılamadı'); return null; }
    return data.id as string;
  }

  async function message() {
    if (isDemo) { toast("Bu bir demo ilandır; mesajlaşma yalnızca gerçek ilanlarda çalışır."); return; }
    setBusy(true); setErr('');
    const t = await openThread();
    setBusy(false);
    if (t) window.location.assign(`/mesajlar/${t}`);
  }

  async function sendOffer(e: FormEvent) {
    e.preventDefault();
    if (isDemo) { toast("Teklif yalnızca gerçek ilanlarda verilebilir."); return; }
    const n = Number(amt);
    if (!n || n < 1) { setErr("Teklif tutarını gir."); return; }
    const body = `Teklifim: ${formatTL(n, language)}${part ? ' (birim fiyat)' : ''}${takas ? ', takas da olabilir' : ''}.${note.trim() ? ' ' + note.trim() : ''}`;
    const chk = checkMessage(body);
    if (chk.block) { setErr(chk.block); return; }
    setBusy(true); setErr('');
    const t = await openThread();
    if (!t || !profile) { setBusy(false); return; }
    const supabase = getSupabase()!;
    let res = await supabase.from('messages').insert({ thread_id: t, sender_id: profile.id, body, kind: 'offer', offer_amount: n });
    if (res.error && /kind|offer_amount/.test(res.error.message)) res = await supabase.from('messages').insert({ thread_id: t, sender_id: profile.id, body });
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    toast("Teklifin gönderildi.");
    window.location.assign(`/mesajlar/${t}`);
  }

  async function report() {
    if (isDemo) { setTicket('Demo ilan, şikayet kaydedilmedi'); return; }
    if (!profile) return needLogin();
    setBusy(true);
    const supabase = getSupabase()!;
    const res = await supabase.from('reports').insert({ reporter_id: profile.id, listing_id: l.id, reason: reason }).select('ticket').maybeSingle();
    setBusy(false);
    if (res.error) {
      setErr(/duplicate|unique/i.test(res.error.message) ? 'Bu ilanı zaten şikayet ettin.' : 'Şikayet gönderilemedi: ' + res.error.message);
      return;
    }
    const tk = (res.data as { ticket?: number } | null)?.ticket;
    setTicket(tk ? `Şikayet alındı, takip no: ŞK-${tk}` : 'Şikayet alındı. Moderatörler inceleyecek.');
    setRepOpen(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="acts-row">
        {phone ? <span className="out" aria-live="polite"><b>{phone}</b></span> : <button className="btn" type="button" onClick={() => void reveal()}>{tr("Telefonu göster")}</button>}
        <button className="btn ghost" type="button" onClick={() => void message()} disabled={busy}>{tr("Mesaj gönder")}</button>
        <button className="btn ghost" type="button" aria-expanded={offerOpen} onClick={() => setOfferOpen(!offerOpen)}>{tr("Teklif ver")}</button>
        <button className="btn ghost" type="button" disabled title={tr("Faz 2")}>{tr("Emanet depozito (yakında)")}</button>
        {ticket ? <span className="pill good" style={{ marginLeft: 'auto' }}>{ticket}</span> : <button className="btn ghost" type="button" style={{ marginLeft: 'auto' }} onClick={() => setRepOpen(!repOpen)}>{tr("İlanı şikayet et")}</button>}
      </div>
      {authReady && !profile ? <div className="sub">{tr("Telefon, mesaj ve teklif için ")}<a className="linkbtn" href="/giris">{tr("giriş yap")}</a>.</div> : null}
      {repOpen ? (
        <div className="panel">
          <h3>{tr("İlanı şikayet et")}</h3>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="rr">{tr("Neden?")}</label>
            <select id="rr" value={reason} onChange={(e) => setReason(e.target.value)}>{REPORT_REASONS.map((r) => <option key={r} value={r}>{tr(r)}</option>)}</select>
            <div><button className="btn" type="button" disabled={busy} onClick={() => void report()}>{tr("Şikayeti gönder")}</button></div>
            <span className="sub">{tr("Şikayetler moderatör tarafından incelenir. Satıcının güven seviyesini yalnızca doğrulanan şikayetler etkiler.")}</span>
          </div>
        </div>
      ) : null}
      {offerOpen ? (
        <form className="panel" onSubmit={sendOffer} noValidate>
          <h3>{tr("Teklif ver")}</h3>
          <div className="row2" style={{ marginTop: 10 }}>
            <div className="field"><label htmlFor="offAmt">{tr("Teklifin (₺")}{part ? tr(", birim fiyat") : ''})</label>
              <input type="number" id="offAmt" min={1} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(Math.round((l.price * 0.95) / 100) * 100)} /></div>
            <div className="field"><label htmlFor="offNote">{tr("Not (isteğe bağlı)")}</label>
              <input type="text" id="offNote" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={tr("Örn. Cumartesi görebilirim")} /></div>
          </div>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={takas} onChange={(e) => setTakas(e.target.checked)} />{tr("Takas da teklif ediyorum")}</label>
          <button className="btn" type="submit" style={{ marginTop: 10 }} disabled={busy}>{tr("Teklifi gönder")}</button>
        </form>
      ) : null}
      {err ? <div className="err" role="alert">{tr(err)}</div> : null}
    </div>
  );
}
