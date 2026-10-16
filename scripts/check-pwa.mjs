import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const listeners = new Map(); const cached = []; let networkFails = false; let response;
const offline = { status: 200, offline: true };
const context = {
 URL,
 self: { location: { origin: 'https://makinasal.test' }, addEventListener: (name, fn) => listeners.set(name,fn), skipWaiting() {}, clients: { claim: async()=>{} } },
 caches: { open: async()=>({addAll:async urls=>cached.push(...urls)}), keys: async()=>[], delete:async()=>true, match:async()=>offline },
 fetch: async()=> { if(networkFails)throw new Error('offline');return {status:200,private:true}; },
};
vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),context);
let install; listeners.get('install')({waitUntil:p=>install=p}); await install;
assert.deepEqual(cached,['/offline.html','/icons/icon-192.png','/icons/icon-512.png']);
listeners.get('fetch')({request:{url:'https://makinasal.test/mesajlar',method:'GET',mode:'navigate'},respondWith:p=>response=p});
assert.equal((await response).private,true);
networkFails=true;
listeners.get('fetch')({request:{url:'https://makinasal.test/profil',method:'GET',mode:'navigate'},respondWith:p=>response=p});
assert.equal(await response,offline);
response=null;
listeners.get('fetch')({request:{url:'https://database.test/rest/v1/messages',method:'GET',mode:'cors'},respondWith:p=>response=p});
assert.equal(response,null,'API responses must never be intercepted or cached');
listeners.get('fetch')({request:{url:'https://makinasal.test/api/login',method:'POST',mode:'navigate'},respondWith:p=>response=p});
assert.equal(response,null,'Auth mutations must never be intercepted');
console.log('PWA: özel veri önbelleğe alınmıyor, çevrimdışı ekran çalışıyor ✔');
