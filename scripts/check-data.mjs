import assert from 'node:assert/strict';
import { mergeMessages, messageOrder, olderMessagesFilter, MESSAGE_PAGE_SIZE } from '../lib/messages.ts';
import { fetchListingsByIds } from '../lib/dbListings.ts';
const uuid = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const message = (n,time='2026-10-18T12:00:00.123456+00:00') => ({id:uuid(n),created_at:time,body:`Message ${n}`});
const input = Array.from({length:150},(_,n)=>message(n+1));
let history = [];
for(let i=150;i>0;i-=MESSAGE_PAGE_SIZE) history=mergeMessages(history,input.slice(i-MESSAGE_PAGE_SIZE,i).reverse());
assert.equal(history.length,150);
assert.deepEqual(history.map(m=>m.id),input.map(m=>m.id));
assert.equal(mergeMessages(history,[{...input[149],body:'updated'}]).length,150);
assert.equal(mergeMessages(history,[{...input[149],body:'updated'}]).at(-1).body,'updated');
assert.ok(messageOrder(message(2,'2026-10-18T12:00:00.123455+00:00'),message(1))<0,'microsecond precision retained');
assert.ok(messageOrder(message(1,'2026-10-18T14:00:00.123456+02:00'),message(2))<0,'equivalent timezone timestamps use UUID');
assert.equal(olderMessagesFilter(message(50)),`created_at.lt.2026-10-18T12:00:00.123456+00:00,and(created_at.eq.2026-10-18T12:00:00.123456+00:00,id.lt.${uuid(50)})`);
for(const invalid of [{id:'x),body.eq.secret',created_at:input[0].created_at},{id:uuid(1),created_at:'now(),id.gt.0'},{id:uuid(1),created_at:'invalid'}])assert.throws(()=>olderMessagesFilter(invalid));
// A favorite not in the latest 300 listings must be queried by its ID; batch large sets.
const queried=[];
const rows=Array.from({length:121},(_,n)=>({id:uuid(n+1),seller_id:uuid(999),kind:'machine',category:'Ekskavatör',title:'Older favorite '+n,description:'',price:100+n,city:'Ankara',year:null,usage_value:null,usage_unit:null,spec:null,cond:null,compat:null,qty:null,status:n===0?'sold':'active',created_at:'2020-01-01T00:00:00Z',listing_photos:[]}));
let failListings=false;
const fake={storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:path}})})},from(table){
 let ids=[];
 const chain={select(){return chain},in(_column,values){ids=values;return chain},then(resolve){
  if(table==='listings'){queried.push(ids);return Promise.resolve(resolve(failListings?{data:null,error:{message:'offline'}}:{data:rows.filter(r=>ids.includes(r.id)),error:null}));}
  return Promise.resolve(resolve({data:[],error:null}));
 }};return chain;
}};
const result=await fetchListingsByIds(fake,[...rows.map(r=>r.id),rows[0].id,'malformed']);
assert.equal(result.listings.length,121);
assert.deepEqual(queried.map(ids=>ids.length),[50,50,21]);
assert.equal(result.listings[0].status,'sold');
assert.equal(result.listings[0].createdAt,'2020-01-01T00:00:00Z');
failListings=true;
await assert.rejects(()=>fetchListingsByIds(fake,[rows[0].id]),/yüklenemedi/,'network error must not look like removed listing');
console.log('Favoriler: eski ilanlar, 50’lik paketler, satılmış ilan ve ağ hatası ayrımı; mesajlar: 150 kayıt, eş zamanlar, tekrarlar ve güvenli sayfalama geçti ✔');
const {readApiJson}=await import('../lib/http.ts');
assert.deepEqual(await readApiJson(new Response('{"error":"try again"}',{status:503})),{error:'try again'});
for(const json of ['null','[]','"ok"','{"error":{}}'])await assert.rejects(()=>readApiJson(new Response(json)));
const {publicAuthOptions}=await import('../lib/accountSecurity.ts');
const closed={google:false,apple:false,phone:false,emailConfirmation:false,registration:false};
assert.deepEqual(publicAuthOptions(closed),closed);
for(const malformed of [null,{}, {google:'false',apple:false,phone:false,emailConfirmation:false,registration:false}])assert.throws(()=>publicAuthOptions(malformed));
const {parseIyzicoResult}=await import('../lib/iyzico.ts');
assert.equal(parseIyzicoResult({status:'success',token:'token',itemTransactions:[{itemId:uuid(1),paymentTransactionId:'123'}]}).token,'token');
for(const malformed of [{status:true},{token:12},{fraudStatus:'1'},{itemTransactions:{}},{itemTransactions:[{}]}])assert.throws(()=>parseIyzicoResult(malformed));
console.log('API yanıtları: nesne kontrolü, giriş seçeneği türleri ve ödeme yanıtı doğrulaması geçti ✔');
