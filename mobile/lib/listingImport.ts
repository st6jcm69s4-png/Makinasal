/**
 * Başka sitedeki ilanı ekran görüntülerinden aktarma (sunucu: supabase/functions/listing-import).
 * Kullanıcı kendi ilanının en fazla 4 ekran görüntüsünü seçer; görüntüler küçültülüp gönderilir,
 * yapay zeka okuduğu bilgileri döndürür. Başka sitelere istek atılmaz. Günde 15 aktarma.
 * Ekran görüntüleri ilan fotoğrafı olarak eklenmez (başka sitenin filigranı ve düşük kalite).
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

export type ImportedFields = {
  category: string | null; brand: string | null; model: string | null; year: number | null;
  usage_value: number | null; usage_unit: 'saat' | 'km' | null; price: number | null; city: string | null;
  description: string | null; takas: boolean | null; cond: string | null; qty: number | null;
  part_group: string | null; equipment_category: string | null; compat: string | null;
};
export type ImportResult =
  | { ok: true; fields: ImportedFields; notes: string | null }
  | { ok: false; error: 'cancelled' | 'not_listing' | 'limit' | 'not_configured' | 'failed' };

const LONG_EDGE = 1568; // yapay zekanın görüntüyü küçültmeden okuduğu en büyük kenar

async function toJpegBase64(a: ImagePicker.ImagePickerAsset): Promise<string | null> {
  try {
    const ctx = ImageManipulator.manipulate(a.uri);
    const w = a.width || 0, h = a.height || 0;
    if (Math.max(w, h) > LONG_EDGE) ctx.resize(h >= w ? { height: LONG_EDGE } : { width: LONG_EDGE });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
    return out.base64 ?? null;
  } catch {
    return null;
  }
}

/** Ekran görüntülerini seçtirir (galeri). Seçilmezse null. */
export async function pickScreenshots(): Promise<ImagePicker.ImagePickerAsset[] | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4, quality: 1 });
  if (res.canceled || !res.assets.length) return null;
  return res.assets.slice(0, 4);
}

export async function importFromScreenshots(assets: ImagePicker.ImagePickerAsset[]): Promise<ImportResult> {
  const images = (await Promise.all(assets.map(toJpegBase64))).filter((x): x is string => !!x);
  if (!images.length) return { ok: false, error: 'failed' };
  const { data, error } = await supabase.functions.invoke('listing-import', { body: { images } });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) return { ok: false, error: 'limit' };
    if (status === 503) return { ok: false, error: 'not_configured' };
    return { ok: false, error: 'failed' };
  }
  const r = data as { ok?: boolean; reason?: string; fields?: ImportedFields; notes?: string | null } | null;
  if (r?.ok && r.fields) return { ok: true, fields: r.fields, notes: r.notes ?? null };
  if (r?.reason === 'not_listing') return { ok: false, error: 'not_listing' };
  return { ok: false, error: 'failed' };
}

/** Kaç alan dolduruldu (kullanıcıya özet için) */
export const filledCount = (f: ImportedFields) =>
  Object.entries(f).filter(([k, v]) => k !== 'usage_unit' && v !== null && v !== '').length;
