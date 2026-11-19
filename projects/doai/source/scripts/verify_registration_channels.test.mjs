import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationChannels, validRegistrationChannel, registrationChannelLabel, canManageRegistrations, registrationAccessKey } from '../src/lib/registrationChannel.ts';
import { getAtomclubUser, toDoaiUser } from '../src/lib/atomclubAuth.ts';
import { registrationContentKey } from '../src/lib/registrationContent.ts';
import { saveRegistration } from '../src/lib/registrationRequest.ts';
import { registrationCSV } from '../src/lib/registrationApi.ts';
import { attendanceCSV } from '../src/lib/attendanceApi.ts';

test('four channels are independent of track; only valid scoped server identities can enter management',()=>{
 assert.deepEqual(registrationChannels.map(row=>row.id),['public','atom','dobe','overseas']);
 for(const value of ['all','',null,undefined,{},['dobe']])assert.equal(validRegistrationChannel(value),false);
 for(const channel of registrationChannels){const user=toDoaiUser({id:'operator',operatorChannel:channel.id,isAdmin:false});assert.equal(user.role,'channel_operator');assert.equal(canManageRegistrations(user),true);}
 assert.equal(toDoaiUser({id:'operator',operatorChannel:'all'}).role,'maker');
 assert.equal(toDoaiUser({id:'root',isAdmin:true,operatorChannel:'dobe'}).operatorChannel,undefined);
 assert.notEqual(registrationAccessKey({role:'channel_operator',operatorChannel:'dobe'}),registrationAccessKey({role:'channel_operator',operatorChannel:'atom'}));
});

test('failed supplemental lookup never inherits operator privileges from the main account response',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async input=>String(input).includes('/api/user')?new Response(JSON.stringify({id:'account',operatorChannel:'dobe',isAdmin:true})):new Response('{}',{status:503});
 try{const user=await getAtomclubUser();assert.equal(user.operatorChannel,undefined);assert.equal(toDoaiUser(user).role,'maker');}finally{globalThis.fetch=original;}
});

test('channel changes participate in retry matching; missing channels have no selectable label and exports label valid channels',()=>{
 const row={id:'reg',makerId:'M1',projectName:'Project',teamName:'Team',track:'creator',projectSummary:'Summary',members:[],submittedAt:'2026-10-30'};
 assert.notEqual(registrationContentKey({...row,channel:'dobe'},'owner'),registrationContentKey({...row,channel:'atom'},'owner'));
 assert.equal(registrationContentKey(row,'owner'),registrationContentKey({...row,channel:null},'owner'));
 assert.equal(registrationChannelLabel(null),'—');
 for(const csv of [registrationCSV([{...row,channel:'dobe'}]),attendanceCSV([{id:'ticket',channel:'dobe',holderName:'=FORMULA()',organization:'A,"B"\nC'}])]){assert.ok(csv.includes('报名渠道'));assert.ok(csv.includes('德必集团'));}
 const csv=attendanceCSV([{id:'ticket',holderName:'=FORMULA()',organization:'A,"B"\nC'}]);
 assert.ok(csv.includes("'=FORMULA()"));assert.ok(csv.includes('A,""B""\nC'));assert.equal(csv.includes('未标注渠道'),false);assert.equal(registrationChannelLabel(null,true),'—');
});

test('old backend cannot silently drop a selected channel',async()=>{
 const original=globalThis.fetch;let posts=0;
 globalThis.fetch=async(input,init)=>{if(init.method==='POST')posts++;const url=new URL(input,'http://local');const key=decodeURIComponent(url.searchParams.get('__p')?.split('/').at(-1)||url.pathname.split('/').at(-1));return new Response(JSON.stringify({ok:true,userId:'owner',requestKey:key,found:false,contactPolicy:'account'}));};
 try{await assert.rejects(saveRegistration({track:'creator',channel:'dobe'},'owner',()=>true),/渠道服务尚未就绪/);assert.equal(posts,0);}finally{globalThis.fetch=original;}
});


test('only DOAI capability enables channel inputs; missing capability keeps legacy signup available', async () => {
 const original=globalThis.fetch;
 try {
  for(const policy of [undefined, 'scoped-v1']) {
   globalThis.fetch=async input=>new Response(JSON.stringify(String(input).includes('/api/user') ? {id:'owner',channelPolicy:'scoped-v1'} : {isAdmin:false,channelPolicy:policy}));
   const user=toDoaiUser(await getAtomclubUser());
   assert.equal(user.registrationChannelsEnabled,policy==='scoped-v1');
  }
  globalThis.fetch=async input=>String(input).includes('/api/user') ? new Response(JSON.stringify({id:'owner',channelPolicy:'scoped-v1'})) : new Response('{}',{status:503});
  assert.equal(toDoaiUser(await getAtomclubUser()).registrationChannelsEnabled,false);
 } finally {globalThis.fetch=original;}
});
