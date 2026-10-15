'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { CATEGORIES, CITIES, KM_CATEGORIES, LIMITS } from '@/lib/data/constants';
import { formatTL } from '@/lib/format';
import { resizeImage } from '@/lib/image';
import { isPartCategory } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase/client';
import { useMarket } from './MarketProvider';

const CONDITIONS = ['Sıfır', 'Çıkma', 'Revizyonlu'];
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const YEAR_MAX = new Date().getFullYear() + 1;

type Photo = { key: string; url: string; file?: File; id?: string; path?: string };

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('duzenle');
  const { profile, authReady, stats, reload, toast } = useMarket();
  const maxPhotos = profile?.is_premium ? LIMITS.prem.photos : LIMITS.free.photos;
  const maxListings = profile?.is_premium ? LIMITS.prem.listings : LIMITS.free.listings;

  const [loaded, setLoaded] = useState(!editId);
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [year, setYear] = useState('');
  const [usage, setUsage] = useState('');
  const [unit, setUnit] = useState<'saat' | 'km'>('saat');
  const [spec, setSpec] = useState('');
  const [cond, setCond] = useState('Sıfır');
  const [compat, setCompat] = useState('');
  const [qty, setQty] = useState('');
  const [takas, setTakas] = useState(false);
  const [serial, setSerial] = useState(false);
  const [desc, setDesc] = useState('');
  const [pledge, setPledge] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removed, setRemoved] = useState<Photo[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [partial, setPartial] = useState<{ id: string; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []);

  const part = cat ? isPartCategory(cat) : false;
  const kind = !cat ? '' : cat === 'Yedek parça' ? 'part' : cat === 'Lastik ve jant' ? 'tire' : 'machine';

  // Şehri profilden varsayılan al
  useEffect(() => { if (profile && !city && !editId) setCity(profile.city); }, [profile, city, editId]);

  // Düzenleme: mevcut ilanı yükle
  useEffect(() => {
    if (!editId || !profile) return;
    const supabase = getSupabase();
    if (!supabase) return;
    (async () => {
      let res = await supabase.from('listings').select('*,listing_photos(id,path,position)').eq('id', editId).eq('seller_id', profile.id).maybeSingle();
      if (res.error || !res.data) { setError('Bu ilan bulunamadı ya da sana ait değil.'); setLoaded(true); return; }
      const r = res.data as Record<string, unknown>;
      setCat(r.category as string); setCity(r.city as string); setPrice(String(Number(r.price)));
      setBrand((r.brand as string) ?? ''); setModel((r.model as string) || (r.brand ? '' : (r.title as string)));
      setYear(r.year ? String(r.year) : ''); setUsage(r.usage_value != null ? String(r.usage_value) : '');
      setUnit(r.usage_unit === 'km' ? 'km' : 'saat'); setSpec((r.spec as string) ?? ''); setCond((r.cond as string) ?? 'Sıfır');
      setCompat((r.compat as string) ?? ''); setQty(r.qty ? String(r.qty) : ''); setTakas(!!r.takas); setSerial(!!r.serial_declared);
      setDesc((r.description as string) ?? ''); setPledge(true);
      const ph = ((r.listing_photos as { id: string; path: string; position: number }[]) ?? []).sort((a, b) => a.position - b.position);
      setPhotos(ph.map((p) => ({ key: p.id, id: p.id, path: p.path, url: supabase.storage.from('listing-photos').getPublicUrl(p.path).data.publicUrl })));
      setLoaded(true);
    })();
  }, [editId, profile]);

  const pickCat = (c: string) => { setCat(c); setUnit(KM_CATEGORIES.has(c) ? 'km' : 'saat'); };

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError('');
    const next = [...photos];
    for (const file of Array.from(list)) {
      if (!TYPES.includes(file.type)) { setError('Yalnızca JPG, PNG veya WebP fotoğraf yüklenebilir.'); continue; }
      if (file.size > MAX_FILE_BYTES) { setError('Bir fotoğraf 15 MB sınırını aşıyor.'); continue; }
      if (next.length >= maxPhotos) { setError(`En fazla ${maxPhotos} fotoğraf ekleyebilirsin.${profile?.is_premium ? '' : ' Premium ile 20 fotoğraf eklenir.'}`); break; }
      next.push({ key: `${Date.now()}-${next.length}-${file.name}`, file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };
  function removePhoto(i: number) {
    const p = photos[i];
    if (p.file) URL.revokeObjectURL(p.url); else setRemoved((r) => [...r, p]);
    setPhotos(photos.filter((_, k) => k !== i));
  }
  const makeCover = (i: number) => setPhotos([photos[i], ...photos.filter((_, k) => k !== i)]);

  const priceNum = Number(price);
  const med = cat && !part ? stats.median(cat, 2) : null;
  let priceNote: { cls: string; text: string } | null = null;
  if (priceNum > 0 && cat && !part) {
    if (!med) priceNote = { cls: 'good', text: 'Bu kategoride karşılaştıracak yeterli ilan yok.' };
    else {
      const f = stats.flag(priceNum, cat), ref = formatTL(Math.round(med / 1000) * 1000);
      priceNote = f === 'low' ? { cls: 'bad', text: `Fiyat bu kategorinin ortancası olan ${ref} seviyesinin çok altında. Yayınlanırsa ilan "fiyat çok düşük" uyarısıyla gösterilir ve incelemeye alınabilir.` }
        : f === 'high' ? { cls: '', text: `Fiyat kategori ortancası olan ${ref} seviyesinin belirgin üstünde. Alıcılar ilanı pahalı bulabilir.` }
        : { cls: 'good', text: `Fiyat kategori ortancası olan ${ref} ile uyumlu.` };
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const supabase = getSupabase();
    if (!supabase || !profile) { setError('İlan vermek için giriş yapmalısın.'); return; }
    const yearNum = year ? Number(year) : null;
    if (!cat) return setError('Kategori seç.');
    if (!brand.trim() || !model.trim()) return setError(`Marka ve ${part ? 'ürün adı' : 'model'} alanlarını doldur.`);
    if (part) {
      if (!spec.trim()) return setError(`${cat === 'Lastik ve jant' ? 'Lastik ebadını' : 'Parça numarasını'} gir.`);
      if (!(Number(qty) >= 1)) return setError('Adet gir.');
    } else {
      if (!yearNum || yearNum < 1980 || yearNum > YEAR_MAX) return setError(`Model yılı 1980 ile ${YEAR_MAX} arasında olmalı.`);
      if (usage === '') return setError('Çalışma saati veya km bilgisini gir.');
    }
    if (!city) return setError('Şehir seç.');
    if (!(priceNum > 0)) return setError('Fiyatı gir.');
    if (photos.length === 0) return setError('En az 1 fotoğraf ekle. Alıcılar fotoğrafsız ilanlara güvenmez.');
    if (!pledge) return setError('Kapora taahhüdünü onaylaman gerekiyor.');

    setBusy(true);
    try {
      if (!editId) {
        const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id).in('status', ['active', 'paused']);
        if ((count ?? 0) >= maxListings) throw new Error(`${profile.is_premium ? 'Premium' : 'Ücretsiz'} üyelikte aynı anda ${maxListings} ilan olabilir. Profilinden bir ilanı satıldı yap ya da sil${profile.is_premium ? '' : ', veya Premium sayfasına bak'}.`);
      }
      const base = {
        kind, category: cat, title: `${brand.trim()} ${model.trim()}`, description: desc.trim(), price: priceNum, city,
        year: part ? null : yearNum, usage_value: !part && usage !== '' ? Number(usage) : null, usage_unit: !part && usage !== '' ? unit : null,
        spec: part ? spec.trim() : null, cond: part ? cond : null, compat: part && compat.trim() ? compat.trim() : null, qty: part ? Number(qty) : null,
      };
      const extra = { brand: brand.trim(), model: model.trim(), takas, serial_declared: !part && serial };
      const write = async (values: Record<string, unknown>) => (editId
        ? supabase.from('listings').update(values).eq('id', editId).select('id').single()
        : supabase.from('listings').insert({ ...values, seller_id: profile.id }).select('id').single());
      let res = await write({ ...base, ...extra });
      if (res.error && /brand|model|takas|serial_declared/.test(res.error.message)) res = await write(base); // 005 henüz çalıştırılmadıysa
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'İlan kaydedilemedi');
      const id = res.data.id as string;

      // Silinen eski fotoğraflar
      if (removed.length > 0) {
        await supabase.storage.from('listing-photos').remove(removed.map((p) => p.path!).filter(Boolean));
        await supabase.from('listing_photos').delete().in('id', removed.map((p) => p.id!));
      }
      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        setProgress(`Fotoğraflar kaydediliyor (${i + 1}/${photos.length})…`);
        try {
          if (p.id) { await supabase.from('listing_photos').update({ position: i }).eq('id', p.id); continue; }
          const blob = await resizeImage(p.file!);
          const path = `${profile.id}/${id}/${i}-${Date.now()}.jpg`;
          const up = await supabase.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          const link = await supabase.from('listing_photos').insert({ listing_id: id, path, position: i });
          if (link.error) throw link.error;
        } catch { failed++; }
      }
      void reload();
      if (failed > 0) { setPartial({ id, failed }); return; }
      toast(editId ? 'İlan güncellendi.' : 'İlan yayınlandı. Ücret: 0 ₺');
      router.push(`/ilanlar/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  if (!authReady || !loaded) return <div className="empty">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok. <code>.env.local</code> dosyasını kontrol et.</div>;
  if (!profile) return <div className="panel">İlan vermek için önce <Link className="linkbtn" href="/giris">giriş yap ya da kayıt ol</Link>.</div>;
  if (partial) {
    return (
      <div className="panel">
        <div className="note">İlanın kaydedildi ama {partial.failed} fotoğraf yüklenemedi. Profilinden ilanı düzenleyip tekrar deneyebilirsin.</div>
        <p style={{ display: 'flex', gap: 8 }}><Link className="btn" href={`/ilanlar/${partial.id}`}>İlana git</Link><Link className="btn ghost" href="/profil">Profil</Link></p>
      </div>
    );
  }

  return (
    <form className="panel" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }} onSubmit={onSubmit} noValidate>
      <div className="row2">
        <div className="field"><label htmlFor="f-cat">Kategori</label>
          <select id="f-cat" value={cat} onChange={(e) => pickCat(e.target.value)}><option value="">Seç…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="f-brand">Marka</label><input type="text" id="f-brand" value={brand} maxLength={60} onChange={(e) => setBrand(e.target.value)} placeholder="Örn. Hidromek" /></div>
        <div className="field"><label htmlFor="f-model">{part ? 'Parça veya ürün adı' : 'Model'}</label><input type="text" id="f-model" value={model} maxLength={80} onChange={(e) => setModel(e.target.value)} placeholder={part ? 'Örn. Hidrolik pompa' : 'Örn. HMK 220 LC'} /></div>
      </div>
      {cat && !part ? (
        <div className="row2">
          <div className="field"><label htmlFor="f-year">Model yılı</label><input type="number" id="f-year" min={1980} max={YEAR_MAX} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" /></div>
          <div className="field"><label htmlFor="f-use">Kullanım</label>
            <div className="row-mm" style={{ gridTemplateColumns: '1fr 96px' }}>
              <input type="number" id="f-use" min={0} value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="6500" />
              <select aria-label="Birim" value={unit} onChange={(e) => setUnit(e.target.value as 'saat' | 'km')}><option value="saat">saat</option><option value="km">km</option></select>
            </div></div>
        </div>
      ) : null}
      {part ? (
        <div className="row2">
          <div className="field"><label htmlFor="f-spec">{cat === 'Lastik ve jant' ? 'Lastik ebadı' : 'Parça numarası'}</label><input type="text" id="f-spec" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder={cat === 'Lastik ve jant' ? 'Örn. 315/80R22.5' : 'Örn. A10VO71'} /></div>
          <div className="field"><label htmlFor="f-cond">Durum</label><select id="f-cond" value={cond} onChange={(e) => setCond(e.target.value)}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="f-compat">Uyumlu makine veya araç</label><input type="text" id="f-compat" value={compat} onChange={(e) => setCompat(e.target.value)} placeholder="Örn. Hidromek HMK 220 LC" /></div>
          <div className="field"><label htmlFor="f-qty">Adet</label><input type="number" id="f-qty" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" /></div>
        </div>
      ) : null}
      <div className="row2">
        <div className="field"><label htmlFor="f-city">Şehir</label>
          <select id="f-city" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Seç…</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="f-price">{part ? 'Birim fiyat' : 'Fiyat'} (₺, KDV dahil)</label><input type="number" id="f-price" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3500000" /></div>
      </div>
      {priceNote ? <div className={`note ${priceNote.cls}`.trim()}>{priceNote.text}</div> : null}
      <label className="check"><input type="checkbox" checked={takas} onChange={(e) => setTakas(e.target.checked)} />Takas kabul ederim</label>
      {cat && !part ? <label className="check"><input type="checkbox" checked={serial} onChange={(e) => setSerial(e.target.checked)} />Seri / şasi numarasını alıcıya göstereceğim (ilanda &quot;beyan edildi&quot; olarak görünür)</label> : null}

      <div className="field">
        <span className="lbl">Fotoğraflar <span className="out">{photos.length} / {maxPhotos}</span></span>
        <div className={`drop${drag ? ' on' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          <span>Fotoğrafları buraya sürükle veya telefondan seç</span>
          <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>Fotoğraf seç</button>
          <input ref={fileRef} type="file" className="sr" accept="image/jpeg,image/png,image/webp" multiple tabIndex={-1} aria-label="Fotoğraf seç" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <span className="sub">Makinenin dört yönünden, kabin içinden, saat göstergesinden ve seri plakasından çek. İlk fotoğraf kapak olur.</span>
        </div>
        {photos.length > 0 ? (
          <div className="ph-grid">
            {photos.map((p, i) => (
              <div key={p.key} className="ph">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Fotoğraf ${i + 1}`} />
                {i === 0 ? <span className="pill prem tg">Kapak</span> : null}
                <div className="acts">
                  {i > 0 ? <button type="button" onClick={() => makeCover(i)}>Kapak yap</button> : <span />}
                  <button type="button" onClick={() => removePhoto(i)} aria-label={`Fotoğraf ${i + 1} kaldır`}>Kaldır</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field"><label htmlFor="f-desc">Açıklama</label><textarea id="f-desc" rows={5} maxLength={4000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Bakım geçmişi, belgeler, takas durumu" /></div>
      <label className="check"><input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} />Alıcı ürünü görmeden kapora veya ön ödeme istemeyeceğimi kabul ediyorum.</label>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {progress ? <div className="sub" role="status">{progress}</div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : editId ? 'Değişiklikleri kaydet' : 'İlanı yayınla'}</button>
        <span className="sub">İlan ücreti: 0 ₺ · 30 günde bir &quot;hâlâ satılık mı?&quot; sorulur</span>
      </div>
    </form>
  );
}

export function ListingForm() {
  return <Suspense fallback={<div className="empty">Yükleniyor…</div>}><Form /></Suspense>;
}
