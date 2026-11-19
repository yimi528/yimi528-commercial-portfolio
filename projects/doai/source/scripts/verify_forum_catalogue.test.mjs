import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublishedForums, loadManagedForums } from '../src/lib/forumCatalogueApi.ts';
import { forumRules } from '../src/lib/forumSchedule.ts';
const session={id:'session-11111111-1111-1111-1111-111111111111',title:'Confirmed session',startsAt:'2026-12-07T09:00:00+08:00',endsAt:'2026-12-07T11:00:00+08:00',publication:'published',bookingEnabled:true,capacity:2,bookedCount:1,speakers:[]};
test('dynamic schedule controls pause, capacity and exact deadlines without a hardcoded ID',()=>{
 const at=Date.parse('2026-11-01T00:00:00Z');
 const rules=forumRules(session.id,at,session);assert.equal(rules.bookingOpen,true);
 assert.equal(rules.cancellationDeadline,'2026-12-05T01:00:00.000Z');
 assert.equal(forumRules(session.id,Date.parse(rules.cancellationDeadline),session).cancellationOpen,false);
 assert.equal(forumRules(session.id,at,{...session,bookedCount:2}).bookingOpen,false);
 assert.equal(forumRules(session.id,at,{...session,bookingEnabled:false}).bookingOpen,false);
 assert.equal(forumRules(session.id,at,{...session,publication:'draft'}).bookingOpen,false);
 assert.equal(forumRules(session.id,Date.parse(session.endsAt),session).bookingOpen,false);
});
test('catalogue reads distinguish an empty programme from missing, duplicate and private data',async()=>{
 const old=globalThis.fetch;
 const reply=value=>{globalThis.fetch=async()=>new Response(JSON.stringify(value));};
 try{
  reply({ok:true,forums:[]});assert.deepEqual(await loadPublishedForums(),[]);
  for(const value of [{ok:true},{ok:true,forums:[session,session]},{ok:true,forums:[{...session,publication:'draft'}]},{ok:true,forums:[{...session,capacity:-1}]},{ok:true,forums:[{...session,startsAt:'bad'}]}]){reply(value);await assert.rejects(loadPublishedForums());}
  reply({ok:true,forums:[session]});assert.equal((await loadPublishedForums())[0].id,session.id);
  reply({ok:true,forums:[session],version:null});assert.equal((await loadManagedForums()).version,null);
  reply({ok:true,forums:[session]});await assert.rejects(loadManagedForums());
 }finally{globalThis.fetch=old;}
});
test('only a missing legacy catalogue route falls back to an unpublished programme',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'HTTP_ERROR',message:'Cannot GET /api/doai/forums'}}),{status:404});
  assert.deepEqual(await loadPublishedForums(),[]);
  for(const [status,message] of [[404,'Catalogue not found'],[503,'Cannot GET /api/doai/forums'],[403,'Forbidden']]){
   globalThis.fetch=async()=>new Response(JSON.stringify({error:{message}}),{status});
   await assert.rejects(loadPublishedForums());
  }
 }finally{globalThis.fetch=old;}
});
