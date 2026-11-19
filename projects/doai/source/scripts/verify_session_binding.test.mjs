import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, apiRequest } from '../src/lib/api.ts';
import { actorSnapshot, authSessionEpoch, bindDoaiActor, doaiRequestPath, doaiRouteNeedsActor, PENDING_ACTOR } from '../src/lib/authSession.ts';
import { loginAtomclub } from '../src/lib/atomclubAuth.ts';
import { readBrowserValue } from '../src/lib/browserStorage.ts';
const fixture=async work=>{
 const oldFetch=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),rows=new Map([['user_token','qa-a']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)}});
 bindDoaiActor('a');
 try{await work(rows);}finally{bindDoaiActor(null);globalThis.fetch=oldFetch;if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
};
test('both API deployment shapes classify actor-bound routes while identity probes and pure public reads remain usable',()=>{
 assert.equal(doaiRequestPath('/api/doai?__p=tickets'),'/tickets');assert.equal(doaiRequestPath('/doai/api/doai/recruitments/post/like'),'/recruitments/post/like');assert.equal(doaiRequestPath('https://elsewhere.example/api/doai/tickets'),null);
 assert.equal(doaiRouteNeedsActor('/me','GET'),false);assert.equal(doaiRouteNeedsActor('/site-config','GET'),false);assert.equal(doaiRouteNeedsActor('/site-config','POST'),true);assert.equal(doaiRouteNeedsActor('/recruitments','GET'),true);
});
test('business requests include the confirmed actor, including Request objects',async()=>fixture(async()=>{
 let actor;globalThis.fetch=async(_input,init)=>{actor=new Headers(init.headers).get('X-DOAI-Actor');return new Response('{}');};
 await apiRequest('/api/tickets');assert.equal(actor,'a');
 await apiFetch(new Request('http://localhost/api/doai?__p=site-config',{method:'POST',body:'{}'}));assert.equal(actor,'a');
 await apiRequest('/api/user/me');assert.equal(actor,null);
}));
test('a token replaced under the old UI blocks a write before fetch',async()=>fixture(async rows=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}');};rows.set('user_token','qa-b');bindDoaiActor('a');
 await assert.rejects(apiRequest('/api/tickets',{}),error=>error.code==='DOAI_SESSION_CHANGED');assert.equal(calls,0);assert.equal(actorSnapshot().actor,PENDING_ACTOR);
}));
test('late unauthorized responses cannot expire a newly accepted identity',async()=>fixture(async rows=>{
 let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});const old=apiRequest('/api/cards');
 rows.set('user_token','qa-b');bindDoaiActor('b');const epoch=authSessionEpoch();release(new Response('{"message":"old expired"}',{status:401}));await assert.rejects(old);
 assert.equal(actorSnapshot().actor,'b');assert.equal(authSessionEpoch(),epoch);
}));
test('a late login response cannot replace a token written by another session',async()=>fixture(async rows=>{
 let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});const pending=loginAtomclub('13800000000','123456');rows.set('user_token','qa-b');release(new Response('{"token":"late-a"}'));
 await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');assert.equal(readBrowserValue('user_token'),'qa-b');
}));
