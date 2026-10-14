'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CATEGORIES, CITIES, KM_CATEGORIES } from '@/lib/data/constants';
import { resizeImage } from '@/lib/image';
import { isPartCategory } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase/client';

const CONDITIONS = ['Sıfır', 'Çıkma', 'Revizyonlu'];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // seçilen dosya; yüklemeden önce küçültülür
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Preview = { file: File; url: string };

export function ListingForm() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(8);

  const [cat, setCat] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [year, setYear] = useState('');
  const [usage, setUsage] = useState('');
  const [spec, setSpec] = useState('');
  const [cond, setCond] = useState('');
  const [compat, setCompat] = useState('');
  const [qty, setQty] = useState('');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<Preview[]>([]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [partial, setPartial] = useState<{ id: string; failed: number } | null>(null);

  const part = cat ? isPartCategory(cat) : false;
  const kind = !cat ? '' : cat === 'Yedek parça' ? 'part' : cat === 'Lastik ve jant' ? 'tire' : 'machine';
  const unit = KM_CATEGORIES.has(cat) ? 'km' : 'saat';

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setReady(true); return; }
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_premium').eq('id', uid).maybeSingle();
        setMaxPhotos(p?.is_premium ? 20 : 8);
      }
      setReady(true);
    });
  }, []);

  // Önizleme adreslerini yalnızca sayfadan çıkarken serbest bırak (tek tek kaldırma removePhoto'da)
  const photosRef = useRef<Preview[]>([]);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError('');
    const next: Preview[] = [...photos];
    for (const file of Array.from(list)) {
      if (!TYPES.includes(file.type)) { setError('Yalnızca JPG, PNG veya WebP fotoğraf yüklenebilir.'); continue; }
      if (file.size > MAX_FILE_BYTES) { setError('Bir fotoğraf 15 MB sınırını aşıyor.'); continue; }
      if (next.length >= maxPhotos) { setError(`En fazla ${maxPhotos} fotoğraf ekleyebilirsin.`); break; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, k) => k !== i));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const supabase = getSupabase();
    if (!supabase || !userId) { setError('İlan vermek için giriş yapmalısın.'); return; }
    const priceNum = Number(price);
    const yearNum = year ? Number(year) : null;
    if (!cat) return setError('Kategori seç.');
    if (title.trim().length < 5) return setError('Başlık en az 5 karakter olmalı.');
    if (!city) return setError('Şehir seç.');
    if (!(priceNum > 0)) return setError('Geçerli bir fiyat gir.');
    if (yearNum !== null && (yearNum < 1950 || yearNum > new Date().getFullYear() + 1)) return setError('Model yılı geçerli değil.');
    if (photos.length === 0 && !window.confirm('Fotoğrafsız ilanlar çok az ilgi görür. Yine de devam edilsin mi?')) return;

    setBusy(true);
    try {
      const { data: row, error: insErr } = await supabase
        .from('listings')
        .insert({
          seller_id: userId,
          kind,
          category: cat,
          title: title.trim(),
          description: desc.trim(),
          price: priceNum,
          city,
          year: yearNum,
          usage_value: !part && usage ? Number(usage) : null,
          usage_unit: !part && usage ? unit : null,
          spec: part && spec.trim() ? spec.trim() : null,
          cond: part && cond ? cond : null,
          compat: part && compat.trim() ? compat.trim() : null,
          qty: part && qty ? Number(qty) : null,
        })
        .select('id')
        .single();
      if (insErr || !row) throw new Error(insErr?.message ?? 'İlan kaydedilemedi');

      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Fotoğraflar yükleniyor (${i + 1}/${photos.length})…`);
        try {
          const blob = await resizeImage(photos[i].file);
          const path = `${userId}/${row.id}/${i}-${Date.now()}.jpg`;
          const up = await supabase.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          const link = await supabase.from('listing_photos').insert({ listing_id: row.id, path, position: i });
          if (link.error) throw link.error;
        } catch {
          failed++;
        }
      }
      if (failed > 0) {
        setPartial({ id: row.id, failed });
        return;
      }
      router.push(`/ilanlar/${row.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  if (!ready) return <div className="panel">Yükleniyor…</div>;
  if (!getSupabase()) return <div className="panel">Supabase bağlantısı yok. <code>.env.local</code> dosyasını kontrol et.</div>;
  if (!userId) {
    return (
      <div className="panel">
        İlan vermek için önce <Link href="/giris"><b>giriş yap ya da kayıt ol</b></Link>.
      </div>
    );
  }
  if (partial) {
    return (
      <div className="panel">
        <div className="alert high">
          İlanın kaydedildi ama {partial.failed} fotoğraf yüklenemedi. İlanlarım sayfasından ilanı açıp tekrar deneyebilirsin.
        </div>
        <p><Link className="btn" href={`/ilanlar/${partial.id}`}>İlana git</Link> <Link className="btn ghost" href="/ilanlarim">İlanlarım</Link></p>
      </div>
    );
  }

  return (
    <form className="panel form" onSubmit={onSubmit}>
      <label htmlFor="cat">Kategori *</label>
      <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)} required>
        <option value="">Seç…</option>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      <label htmlFor="title">İlan başlığı *</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
        placeholder={part ? 'Örn. Rexroth hidrolik pompa A10VO71' : 'Örn. Hidromek HMK 220 LC ekskavatör'} required />

      <div className="row2">
        <div>
          <label htmlFor="city">Şehir *</label>
          <select id="city" value={city} onChange={(e) => setCity(e.target.value)} required>
            <option value="">Seç…</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="price">Fiyat (₺) *</label>
          <input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            placeholder={part ? 'Birim fiyat' : ''} required />
        </div>
      </div>

      {cat && !part ? (
        <div className="row2">
          <div>
            <label htmlFor="year">Model yılı</label>
            <input id="year" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <label htmlFor="usage">{unit === 'km' ? 'Kilometre' : 'Çalışma saati'}</label>
            <input id="usage" inputMode="numeric" value={usage} onChange={(e) => setUsage(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
      ) : null}

      {part ? (
        <>
          <div className="row2">
            <div>
              <label htmlFor="spec">{cat === 'Lastik ve jant' ? 'Ebat (örn. 315/80R22.5)' : 'Parça / OEM numarası'}</label>
              <input id="spec" value={spec} onChange={(e) => setSpec(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cond">Durum</label>
              <select id="cond" value={cond} onChange={(e) => setCond(e.target.value)}>
                <option value="">Seç…</option>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="row2">
            <div>
              <label htmlFor="qty">Adet</label>
              <input id="qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label htmlFor="compat">Uyumlu marka / model</label>
              <input id="compat" value={compat} onChange={(e) => setCompat(e.target.value)} />
            </div>
          </div>
        </>
      ) : null}

      <label htmlFor="desc">Açıklama</label>
      <textarea id="desc" rows={5} maxLength={4000} value={desc} onChange={(e) => setDesc(e.target.value)}
        placeholder="Bakım durumu, belgeler, varsa eksikler…" />

      <label htmlFor="photos">Fotoğraflar (en fazla {maxPhotos})</label>
      <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      {photos.length > 0 ? (
        <div className="thumbs">
          {photos.map((p, i) => (
            <div key={p.url} className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Seçilen fotoğraf ${i + 1}`} />
              <button type="button" onClick={() => removePhoto(i)} aria-label={`Fotoğraf ${i + 1} kaldır`}>×</button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="alert low" role="alert">{error}</div> : null}
      {progress ? <div className="alert ok" role="status">{progress}</div> : null}
      <p className="meta">Ürünü görmeden kapora isteme ve IBAN paylaşma; bu tür ilanlar kaldırılır.</p>
      <p><button className="btn" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'İlanı yayınla'}</button></p>
    </form>
  );
}
