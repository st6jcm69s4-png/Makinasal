// Kural doğrulaması: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/check-logic.mjs
import assert from 'node:assert/strict';
import { trustLevel } from '../lib/trust.ts';
import { safeAuthNext } from '../lib/auth.ts';
import { priceFlag, categoryMedian, buildPriceStats } from '../lib/pricing.ts';
import { checkMessage } from '../lib/messageFilter.ts';
import { LISTINGS } from '../lib/data/listings.ts';
import { SELLERS } from '../lib/data/sellers.ts';
import { distanceKm } from '../lib/geo.ts';

assert.equal(trustLevel({ rep: 2, deals: 50, s: 5 }).label, 'Riskli');
assert.equal(trustLevel({ rep: 0, deals: 3, s: 2.9 }).label, 'Riskli');
assert.equal(trustLevel({ rep: 0, deals: 2, s: 5 }).label, 'Yeni üye');
assert.equal(trustLevel({ rep: 0, deals: 10, s: null }).label, 'Yeni üye');
assert.equal(trustLevel({ rep: 0, deals: 10, s: 4.5 }).label, 'Çok güvenilir');
assert.equal(trustLevel({ rep: 0, deals: 9, s: 4.8 }).label, 'Güvenilir');
assert.equal(trustLevel({ rep: 0, deals: 5, s: 3.5 }).label, 'Orta güven');
assert.equal(checkMessage('TR33 0006 1005 1978 6457 8413 26').block !== null, true);
assert.equal(checkMessage('www.ornek.com').block !== null, true);
assert.equal(checkMessage('kapora göndereyim mi').warn, true);
assert.equal(checkMessage('yarın görelim').warn, false);
assert.equal(priceFlag(LISTINGS, 1150000, 'Ekskavatör'), 'low');
assert.equal(priceFlag(LISTINGS, 1, 'Yedek parça'), null);
assert.ok(distanceKm('Ankara', 'İstanbul') > 330 && distanceKm('Ankara', 'İstanbul') < 360);
for (const l of LISTINGS) assert.ok(SELLERS[l.sel], `satıcı yok: ${l.sel}`);
console.log('Tüm kontroller geçti ✔', LISTINGS.length, 'ilan');

// Email callback destinations must stay on this site.
for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/callback?code=secret', '/\n/evil.example']) {
  assert.equal(safeAuthNext(unsafe), '/ilanlar');
}
assert.equal(safeAuthNext('/ilan-ver?duzenle=123'), '/ilan-ver?duzenle=123');
assert.equal(safeAuthNext('/sifre-yenile'), '/sifre-yenile');
// Synthetic prices must never affect the benchmark for real listings.
const real = { ...LISTINGS[0], demo: false, price: 100000 };
const mixed = [real, { ...real, price: 200000 }, { ...real, demo: true, price: 9000000 }];
assert.equal(categoryMedian(mixed, real.cat), 150000);
assert.equal(buildPriceStats(mixed).median(real.cat), 150000);
console.log('Auth yönlendirmeleri ve gerçek ilan fiyatı kontrolleri geçti ✔');

// Saved searches preserve every filter when opened again.
const { filtersFromParams, filtersToParams } = await import('../lib/searchParams.ts');
const { defaultFilters } = await import('../lib/market.ts');
const savedFilters = { ...defaultFilters(), city: 'Ankara', q: 'Hidromek', takas: true, ver: true, incNew: false, minScore: 4, yMin: '2018', useMax: '5000', maxPrice: 3000000 };
assert.deepEqual(filtersFromParams(filtersToParams(savedFilters)), savedFilters);
assert.equal(filtersFromParams(new URLSearchParams('minScore=NaN&ver=no&city=invalid')).minScore, 0);
console.log('Kayıtlı arama filtreleri kontrol edildi ✔');

// Marketplace inputs: no inherited object keys, incomplete or non-finite coordinates.
const {validKind,validCoordinates,money} = await import('../lib/network.ts');
assert.equal(validKind('constructor'), 'job');
assert.equal(validKind('part_request'), 'part_request');
assert.equal(validCoordinates(null,null), true);
assert.equal(validCoordinates(39.9,null), false);
assert.equal(validCoordinates(NaN,32), false);
assert.equal(validCoordinates(91,32), false);
assert.equal(validCoordinates(39.9,32.8), true);
assert.ok(money(9500,'gün').includes('/ gün'));
console.log('İş ağı: tür, fiyat birimi ve konum doğrulamaları geçti ✔');

const {homeSearchUrl,locationUrl}=await import('../lib/homeSearch.ts');
assert.equal(homeSearchUrl('rental','kamyon','Ankara'),'/kiralik?q=kamyon&city=Ankara');
assert.equal(homeSearchUrl('jobs','  ','Bogus'),'/isler');
assert.equal(new URL('https://example.test'+homeSearchUrl('parts','pompa','İzmir')).searchParams.get('cat'),'Yedek parça');
assert.equal(new URL('https://example.test'+homeSearchUrl('firms','A & B','Ankara')).searchParams.get('q'),'A & B');
assert.equal(locationUrl('/sirketler','Ankara'),'/sirketler?city=Ankara');
assert.equal(new URL('https://example.test'+homeSearchUrl('sale','x'.repeat(250),'')).searchParams.get('q').length,200);
console.log('Ana sayfa: sekme, il, parça kategorisi ve güvenli arama adresleri geçti ✔');
