import assert from 'node:assert/strict';
import {searchSuggestions,matchingRanges,foldSearch} from '../lib/searchSuggestions.ts';
import {categoryValues,categoryLabel,categoryMatches} from '../lib/machineryCatalog.ts';
import {MACHINE_CATEGORIES} from '../lib/data/constants.ts';
const results=searchSuggestions('i',{city:'Ankara'});
assert.equal(results[0].label,'İş makinesi');
assert.ok(results.some(s=>s.label==='İstif makinesi'));
assert.ok(results.every((row,index)=>index===0||results[index-1].rank<=row.rank),'prefixes precede contains matches');
assert.deepEqual(searchSuggestions('   '),[]);
assert.deepEqual(searchSuggestions('<script>alert(1)</script>'),[]);
assert.equal(foldSearch('İŞ MAKİNESİ'),'is makinesi');
assert.equal(foldSearch('IŞIK'),'isik');
assert.ok(searchSuggestions('skava').some(s=>s.label==='Ekskavatör'),'contains fallback');
for(const scope of ['all','sale','rental','jobs','parts','firms'])for(const query of ['i','eksk','vin','cat','pompa']){
 for(const suggestion of searchSuggestions(query,{scope,city:'İzmir'})){
  const u=new URL(suggestion.href,'https://makinasal.test');
  assert.equal(u.origin,'https://makinasal.test');
  assert.equal(u.searchParams.get('city'),'İzmir');
  assert.ok(['/', '/ilanlar','/kiralik','/isler','/is-ve-hizmetler','/yedek-parca','/parca-talepleri','/sirketler'].includes(u.pathname));
 }
}
const rental=searchSuggestions('Ekskavatör',{scope:'rental'}).find(s=>s.id==='category:Ekskavatör');
assert.equal(new URL(rental.href,'https://test').pathname,'/kiralik');
assert.equal(new URL(rental.href,'https://test').searchParams.get('cat'),'Ekskavatör');
const parts=searchSuggestions('Ekskavatör',{scope:'parts'}).find(s=>s.id==='category:Ekskavatör');
assert.equal(new URL(parts.href,'https://test').searchParams.get('equipment'),'Ekskavatör');
const english=searchSuggestions('excavator',{language:'en'}).find(s=>s.id==='category:Ekskavatör');
assert.equal(english.label,'Excavator');
assert.equal(new URL(english.href,'https://test').searchParams.get('cat'),'Ekskavatör');
assert.ok(searchSuggestions('hydraulic',{language:'en',scope:'parts'}).some(s=>s.kind==='part'));
assert.deepEqual(matchingRanges('İstif makinesi','i'),[{start:0,end:1},{start:3,end:4},{start:9,end:10},{start:13,end:14}]);
assert.deepEqual(matchingRanges('İŞ MAKİNESİ','is'),[{start:0,end:2}]);
assert.deepEqual(matchingRanges('Ekskavatör','.*'),[],'query must never become a regular expression');
assert.deepEqual(matchingRanges('😀 İş makinesi','i')[0],{start:3,end:4},'highlight offsets preserve surrogate pairs');
assert.equal(categoryValues('group:machines').length,MACHINE_CATEGORIES.length);
assert.equal(categoryLabel('group:machines'),'İş makinesi');
assert.equal(categoryMatches('Ekskavatör','group:machines'),true);
assert.equal(categoryMatches('Yedek parça','group:machines'),false);
console.log('Search suggestions: prefix ranking, contains fallback, TR/EN matching, safe highlights and real category/brand/part filter URLs passed ✔');
