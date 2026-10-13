// Kural doğrulaması: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/check-logic.mjs
import assert from 'node:assert/strict';
import { trustLevel } from '../lib/trust.ts';
import { priceFlag } from '../lib/pricing.ts';
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
