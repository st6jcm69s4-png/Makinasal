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
const { defaultFilters, filterListings } = await import('../lib/market.ts');
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

const {MACHINE_CATEGORIES,KM_CATEGORIES}=await import('../lib/data/constants.ts');
const {RENTAL_MODES,rentalModeLabel}=await import('../lib/network.ts');
assert.equal(new Set(MACHINE_CATEGORIES).size,MACHINE_CATEGORIES.length);
for(const name of ['Manitou / teleskopik yükleyici','Mobil vinç','Paletli vinç','Fore kazık makinesi','Beton pompası','Diğer iş makinesi'])assert.ok(MACHINE_CATEGORIES.includes(name));
assert.equal(KM_CATEGORIES.has('Damperli kamyon'),true);
assert.equal(KM_CATEGORIES.has('Mini ekskavatör'),false);
assert.equal(rentalModeLabel('with_operator'),'Operatörlü / şoförlü');
assert.equal(rentalModeLabel('machine_only'),'Sadece makine / araç');
assert.equal(rentalModeLabel(null),'Operatör / şoför durumu belirtilmedi');
assert.equal(rentalModeLabel('constructor'),'Operatör / şoför durumu belirtilmedi');
console.log(`Kiralama kapsamı ve ${MACHINE_CATEGORIES.length} makine türü kontrol edildi ✔`);

const catalog=await import('../lib/machineryCatalog.ts');
const categories=catalog.CATEGORY_GROUPS.flatMap(g=>g.categories);
assert.equal(new Set(categories).size,categories.length);
assert.equal(categories.length,MACHINE_CATEGORIES.length+2);
for(const c of MACHINE_CATEGORIES)assert.ok(categories.includes(c),`Gruplanmamış tür: ${c}`);
assert.equal(catalog.categoryMatches('Lastikli ekskavatör','group:excavators'),true);
assert.equal(catalog.categoryMatches('Mobil vinç','group:excavators'),false);
assert.equal(catalog.categoryMatches('Lastikli ekskavatör','Ekskavatör'),false);
assert.deepEqual(catalog.categoryValues('group:unknown'),[]);
assert.ok(catalog.brandsForCategory('Manitou / teleskopik yükleyici').includes('Manitou'));
assert.ok(catalog.brandsForCategory('Mobil vinç').includes('Liebherr'));
assert.ok(!catalog.brandsForCategory('Mobil vinç').includes('Potain'));
assert.ok(catalog.brandsForCategory('Kaynak makinesi').includes('Miller'));
assert.ok(!catalog.brandsForCategory('Kaynak makinesi').includes('Caterpillar'));
assert.ok(catalog.brandsForCategory('constructor').length===0);
assert.equal(catalog.brandMatches('CAT','Caterpillar'),true);
assert.equal(catalog.brandMatches('Mercedes-Benz','Mercedes'),true);
assert.equal(catalog.brandMatches('HİDROMEK','Hidromek'),true);
assert.equal(catalog.brandMatches('Bilinmeyen Marka','başka marka'),false);
assert.equal(catalog.canonicalBrand('CAT'),'Caterpillar');
const oldFilters={...defaultFilters()};delete oldFilters.brand;
assert.equal(filtersToParams(oldFilters).has('brand'),false);
const selectedFilters={...defaultFilters(),cat:'group:excavators',brand:'CAT'};
assert.deepEqual(filtersFromParams(filtersToParams(selectedFilters)),selectedFilters);
const fixture=[{...LISTINGS[0],cat:'Lastikli ekskavatör',brand:'Caterpillar'},{...LISTINGS[0],id:'another',cat:'Mobil vinç',brand:'Caterpillar'}];
assert.equal(filterListings(fixture,SELLERS,selectedFilters,'Ankara').length,1);
console.log(`Katalog: ${catalog.CATEGORY_GROUPS.length} başlık, ${catalog.ALL_BRANDS.length} marka; alt tür ve marka eşleşmeleri geçti ✔`);

const { formatPersonName, capitalizeName, validRegion, districtsFor, TURKEY_REGIONS } = await import('../lib/profile.ts');
assert.equal(formatPersonName('  alperen   eker  '), 'Alperen Eker');
assert.equal(formatPersonName('İBRAHİM IŞIK'), 'İbrahim Işık');
assert.equal(formatPersonName('ışıl şen-ayşe'), 'Işıl Şen-Ayşe');
assert.equal(capitalizeName('alperen '), 'Alperen ');
assert.equal(Object.keys(TURKEY_REGIONS).length, 81);
assert.equal(Object.values(TURKEY_REGIONS).flat().length, 973);
const { CITIES } = await import('../lib/data/constants.ts');
for (const city of CITIES) assert.ok(districtsFor(city).length > 0, city);
assert.ok(districtsFor('Samsun').includes('Çarşamba'));
assert.ok(districtsFor('Ankara').includes('Sincan'));
assert.equal(validRegion('', ''), true);
assert.equal(validRegion('Ankara', ''), true);
assert.equal(validRegion('Ankara', 'Sincan'), true);
assert.equal(validRegion('Ankara', 'Kadıköy'), false);
assert.equal(validRegion('', 'Sincan'), false);
assert.equal(validRegion('constructor', ''), false);
console.log('Profil: Türkçe ad biçimi, 81 il / 973 ilçe ve bölge doğrulaması geçti ✔');

const {passwordValid,normalizePhone,parseAuthOptions}=await import('../lib/accountSecurity.ts');
for(const weak of ['Ab1!','abcdefgh!1','ABCDEFGH!1','Abcdefgh!','Abcdefgh1','Abcdefg1 ','Abcdefg1\n'])assert.equal(passwordValid(weak),false,weak);
for(const strong of ['Abcdef1!','İstanbul1.','Işık2026!'])assert.equal(passwordValid(strong),true);
assert.equal(passwordValid('Aa1!'+ 'x'.repeat(125)),false);
for(const raw of ['0555 123 45 67','+90 (555) 123-45-67','00905551234567','905551234567','5551234567'])assert.equal(normalizePhone(raw),'+905551234567');
for(const raw of ['+445551234567','0532123','02121234567','5551234567x'])assert.equal(normalizePhone(raw),'');
assert.equal(parseAuthOptions({external:{email:true,phone:false},mailer_autoconfirm:true,phone_autoconfirm:false}).registration,false);
assert.equal(parseAuthOptions({external:{email:true,phone:true},mailer_autoconfirm:false,phone_autoconfirm:true}).registration,false);
assert.equal(parseAuthOptions({external:{email:true,phone:true},mailer_autoconfirm:false,phone_autoconfirm:false}).registration,true);
assert.equal(parseAuthOptions({external:{email:true,phone:true},mailer_autoconfirm:false,phone_autoconfirm:false,disable_signup:true}).registration,false);
assert.equal(parseAuthOptions({}).registration,false);
console.log('Hesap güvenliği: şifre koşulları, telefon normalizasyonu ve gerçek sağlayıcı uygunluğu geçti ✔');
