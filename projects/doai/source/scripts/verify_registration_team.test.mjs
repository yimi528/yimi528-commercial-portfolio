import test from 'node:test';
import assert from 'node:assert/strict';
import { saveRegistration, pendingRegistrationKey, clearRegistrationRequest, RegistrationConflict } from '../src/lib/registrationRequest.ts';
import { loadRegistrationTeam } from '../src/lib/registrationTeam.ts';
import { bindDoaiActor } from '../src/lib/authSession.ts';
import { registrationContentKey } from '../src/lib/registrationContent.ts';
const owner='team-qa-owner';
const draft={type:'team',track:'creator',teamName:'Shared',projectName:'Project',projectSummary:'Summary',videoUrl:'',docUrl:'',teamBinding:{kind:'create'},members:[{id:owner,name:'Leader',phone:'',roleTitle:'队长',isLeader:true}]};
async function scenario(work){
 const old={fetch:globalThis.fetch,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};
 globalThis.localStorage={getItem:()=>null};globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
 bindDoaiActor(owner,null);const key=pendingRegistrationKey(owner),calls=[];
 const receipt={ok:true,userId:owner,requestKey:key,found:true,created:false,registration:{...draft,id:'reg',teamId:'real-team',ownerUserId:owner,makerId:'MAKER',status:'submitted',submittedAt:'2026-10-27T00:00:00Z'},ticket:{id:'ticket',ownerUserId:owner,bookingKey:'registration:reg',type:'maker',status:'claimed',qrCode:'QR'}};
 const setFetch=handler=>{globalThis.fetch=async(url,init)=>{calls.push({url:String(url),method:init?.method||'GET'});return new Response(JSON.stringify(await handler()));};};
 try{await work({key,calls,receipt,setFetch});}finally{clearRegistrationRequest(owner,pendingRegistrationKey(owner));Object.assign(globalThis,old);}
}
test('old backends never receive a linked-team POST',()=>scenario(async({key,calls,setFetch})=>{
 setFetch(()=>({ok:true,userId:owner,requestKey:key,found:false,contactPolicy:'account'}));
 await assert.rejects(saveRegistration(draft,owner,()=>true),/战队报名服务尚未就绪/);assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');
}));
test('reload can recover a newly created team as the same existing team, but cannot substitute another team',()=>scenario(async({receipt,setFetch,calls})=>{
 setFetch(()=>receipt);
 await assert.rejects(saveRegistration({...draft,teamBinding:{kind:'existing',id:'other-team'}},owner,()=>true),RegistrationConflict);
 assert.equal((await saveRegistration({...draft,teamBinding:{kind:'existing',id:'real-team'}},owner,()=>true)).registration.id,'reg');
 assert.ok(calls.every(c=>c.method==='GET'));
}));
test('missing team IDs and mismatched existing-team receipts cannot be treated as saved',()=>scenario(async({receipt,setFetch})=>{
 for(const change of [{teamId:undefined},{teamBinding:{kind:'existing',id:'wrong-team'}},{type:'individual'}]){
  setFetch(()=>({...receipt,registration:{...receipt.registration,...change}}));
  await assert.rejects(saveRegistration(draft,owner,()=>true),/回执未确认/);
 }
}));
test('team identity participates in retry content while legacy content stays unlinked',()=>{
 assert.notEqual(registrationContentKey(draft,owner),registrationContentKey({...draft,teamBinding:{kind:'existing',id:'real-team'}},owner));
 const legacy={...draft};delete legacy.teamBinding;assert.ok(!registrationContentKey(legacy,owner).includes('teamBinding'));
});
test('my-team reads validate membership, owner correlation and confirmed roster',()=>scenario(async({setFetch})=>{
 const team={id:'team',name:'Shared',track:'creator',leaderId:owner,members:[{id:owner,name:'Leader',roleTitle:'队长',isLeader:true}]};
 setFetch(()=>({ok:true,userId:owner,team}));assert.equal((await loadRegistrationTeam(owner)).id,'team');
 for(const response of [{ok:true,userId:'other',team:null},{ok:true,team:{...team,members:[]}},{ok:true,team:{...team,leaderId:'intruder'}},{ok:true}]){
  setFetch(()=>response);await assert.rejects(loadRegistrationTeam(owner),/未确认/);
 }
 setFetch(()=>({ok:true,userId:owner,team:null}));assert.equal(await loadRegistrationTeam(owner),null);
}));
