// Mağaza metinlerini videodaki ASO kurallarına göre denetler.
// Çalıştırma (mobile klasöründe): node store/kontrol.mjs
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../store.config.json', import.meta.url), 'utf8'));
const play = JSON.parse(readFileSync(new URL('./google-play.json', import.meta.url), 'utf8'));
// Rakip uygulama markaları anahtar kelimeye yazılmaz (ret ve şikayet sebebi)
const RIVALS = ['sahibinden', 'letgo', 'arabam', 'dolap', 'hepsiburada', 'trendyol', 'mascus', 'machinerytrader', 'truckscout24', 'mobile.de'];
const lower = (s, loc) => s.toLocaleLowerCase(loc.slice(0, 2));
const words = (s, loc) => lower(s, loc).split(/[^\p{L}\p{N}.]+/u).filter(Boolean);
let bad = 0;
const fail = (m) => { bad++; console.log('  ✗ ' + m); };

for (const [loc, i] of Object.entries(cfg.apple.info)) {
  console.log(`\nApp Store · ${loc}`);
  const kw = i.keywords.join(',');
  const parts = kw.split(',');
  console.log(`  başlık ${i.title.length}/30 · alt başlık ${i.subtitle.length}/30 · anahtar kelime ${kw.length}/100 · tanıtım ${i.promoText.length}/170 · açıklama ${i.description.length}/4000`);
  if (i.title.length > 30) fail('başlık 30 karakteri aşıyor');
  if (i.title.length < 22) fail('başlıkta yer kalmış; marka yanına anahtar kelime ekle');
  if (i.subtitle.length > 30) fail('alt başlık 30 karakteri aşıyor');
  if (kw.length > 100) fail('anahtar kelime alanı 100 karakteri aşıyor');
  if (kw.length < 90) fail(`anahtar kelime alanında ${100 - kw.length} karakter boş`);
  if (/,\s|\s,/.test(kw)) fail('virgülün yanında boşluk var');
  const seen = new Set(words(i.title + ' ' + i.subtitle, loc));
  for (const p of parts) {
    if (seen.has(lower(p, loc))) fail(`"${p}" başlıkta/alt başlıkta ya da listede zaten var`);
    seen.add(lower(p, loc));
    if (RIVALS.some((r) => lower(p, loc).includes(r))) fail(`"${p}" rakip markası`);
  }
  if (i.releaseNotes.length > 4000) fail('sürüm notu çok uzun');
}

for (const [loc, p] of Object.entries(play)) {
  console.log(`\nGoogle Play · ${loc}`);
  console.log(`  başlık ${p.title.length}/30 · kısa açıklama ${p.short.length}/80 · açıklama ${p.full.length}/4000`);
  if (p.title.length > 30) fail('başlık 30 karakteri aşıyor');
  if (p.short.length > 80) fail('kısa açıklama 80 karakteri aşıyor');
  if (p.full.length > 4000) fail('açıklama 4000 karakteri aşıyor');
  if (RIVALS.some((r) => lower(p.full + p.short + p.title, loc).includes(r))) fail('rakip markası geçiyor');
}

console.log(bad ? `\n${bad} sorun var.` : '\nHepsi kurallara uygun.');
process.exit(bad ? 1 : 0);
