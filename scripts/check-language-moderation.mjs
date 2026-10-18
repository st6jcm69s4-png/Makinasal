import assert from 'node:assert/strict';
import { containsProfanity } from '../lib/profanity.ts';
import { checkMessage } from '../lib/messageFilter.ts';
import { readFile } from 'node:fs/promises';
import { formatTL } from '../lib/format.ts';
import { money } from '../lib/network.ts';
import { PASSWORD_RULES } from '../lib/accountSecurity.ts';
import { CATEGORY_GROUPS } from '../lib/machineryCatalog.ts';
import { PART_GROUPS } from '../lib/parts.ts';
// Import JSON through the loader-free file API to keep tests portable between Node versions.
const dictionary=JSON.parse(await readFile(new URL('../lib/i18n/en.json',import.meta.url),'utf8'));
const blocked=['AMK','a.m.k','a m k','SİKTİR','s i k t i r','siktirin','amına koyayım','amınakoyim','şerefsiz','pezevenk','gerizekalı','fuck','f.u.c.k','sh1t','f@ggot','fu\u200bck'];
const allowed=['sık görüşelim','sıkıştırma makinesi','sıkıntı yok','Scunthorpe','class','I got the spare parts','piston','şikayet','Yarın pompayı görebilir miyim?','Cumartesi müsaitim','Amina ile görüşelim'];
for(const text of blocked){assert.equal(containsProfanity(text),true,text);assert.ok(checkMessage(text).block,text)}
for(const text of allowed)assert.equal(containsProfanity(text),false,text);
assert.ok(checkMessage('www.example.com').block);assert.ok(checkMessage('iban').block);
assert.ok(Object.keys(dictionary).length>1000);
for(const key of ['Ayarlar','Uygulama dili','İlan ver','Mesajlar','Profil','Ödemelerim','Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.',...PASSWORD_RULES.map(r=>r.label),...CATEGORY_GROUPS.flatMap(g=>[g.label,...g.categories]),...PART_GROUPS.map(g=>g.label)])assert.ok(dictionary[key],`Missing English: ${key}`);
assert.equal(formatTL(1234.5,'en'),'1,234.5 ₺');
assert.ok(money(1250,'gün','en').includes('/ day'));
console.log(`TR/EN moderation: ${blocked.length} blocked variants and ${allowed.length} harmless phrases; ${Object.keys(dictionary).length} translations, catalog/rules and locale formats passed ✔`);
