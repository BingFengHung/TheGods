import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore} from '../src/storage.mjs';
import {freshGame} from '../src/core.mjs';
// Exercise the actual fallback adapter; IndexedDB transactions still need browser QA.
function memoryStorage(){const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};return data;}
test('save and reload retain progress and the previous snapshot',async()=>{memoryStorage();const store=new SaveStore();await store.open();assert(store.degraded);let s=await store.save(freshGame());s.gold=500;await store.save(s);const reload=new SaveStore();await reload.open();assert.equal((await reload.load()).gold,500);assert.equal((await reload.previous()).gold,360);});
test('a stale tab cannot overwrite a newer saved revision',async()=>{memoryStorage();const one=new SaveStore(),two=new SaveStore();await one.open();await two.open();await one.load();await two.load();await one.save(freshGame());await assert.rejects(two.save({...freshGame(),gold:0}),/另一個分頁/);assert.equal((await one.load()).gold,360);});
test('quota failure keeps the previous current progress and rejects',async()=>{memoryStorage();const store=new SaveStore();await store.open();await store.save(freshGame());const set=globalThis.localStorage.setItem;globalThis.localStorage.setItem=(k,v)=>{if(k==='thegods-save')throw Error('QuotaExceededError');set(k,v);};await assert.rejects(store.save({...freshGame(),gold:0}),/Quota/);assert.equal((await store.load()).gold,360);});
test('malformed stored JSON is rejected without erasing it',async()=>{const data=memoryStorage();data.set('thegods-save','{broken');const store=new SaveStore();await store.open();await assert.rejects(store.load());assert.equal(data.get('thegods-save'),'{broken');});
