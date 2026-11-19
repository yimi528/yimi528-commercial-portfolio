import test from 'node:test';
import assert from 'node:assert/strict';
import { readBrowserValue, writeBrowserValue, removeBrowserValue } from '../src/lib/browserStorage.ts';
import { loginAtomclub, logoutAtomclub } from '../src/lib/atomclubAuth.ts';
import { apiRequest } from '../src/lib/api.ts';
const withStorage = async (storage, work) => {
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
 try{await work();}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
};
test('available storage stays authoritative after external token replacement and removal',async()=>{
 const rows=new Map();await withStorage({getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)},async()=>{
  writeBrowserValue('storage-test-normal','one');assert.equal(readBrowserValue('storage-test-normal'),'one');
  rows.set('storage-test-normal','two');assert.equal(readBrowserValue('storage-test-normal'),'two');
  rows.delete('storage-test-normal');assert.equal(readBrowserValue('storage-test-normal'),null);
 });
});
test('denied storage keeps current-document values and safe removals without throwing',async()=>{
 const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
 await withStorage(blocked,async()=>{
  assert.equal(readBrowserValue('storage-test-denied'),null);assert.equal(writeBrowserValue('storage-test-denied','value'),false);
  assert.equal(readBrowserValue('storage-test-denied'),'value');assert.equal(removeBrowserValue('storage-test-denied'),false);assert.equal(readBrowserValue('storage-test-denied'),null);
 });
});
test('a throwing storage property cannot break authenticated API calls or logout',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),oldFetch=globalThis.fetch;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('denied getter');}});
 globalThis.fetch=async(input,init)=>{
  const path=String(input);
  if(path.includes('__p=login'))return new Response(JSON.stringify({token:'qa-memory-token'}));
  assert.equal(new Headers(init.headers).get('Authorization'),'Bearer qa-memory-token');
  if(path.startsWith('/api/user'))return new Response(JSON.stringify({id:'storage-user',name:'Storage QA'}));
  if(path.includes('__p=me'))return new Response(JSON.stringify({isAdmin:false}));
  return new Response(JSON.stringify({ok:true}));
 };
 try{
  const user=await loginAtomclub('13800000000','123456');assert.equal(user.id,'storage-user');assert.equal((await apiRequest('/api/tickets')).ok,true);
  await logoutAtomclub();assert.equal(readBrowserValue('user_token'),null);
 }finally{globalThis.fetch=oldFetch;if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
