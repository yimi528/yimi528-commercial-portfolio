import test from 'node:test';
import assert from 'node:assert/strict';
import { validApplicantAge, validApplicantProfile, registrationContentKey } from '../src/lib/registrationContent.ts';
import { registrationApplicant, registrationCSV } from '../src/lib/registrationApi.ts';
import { saveRegistration } from '../src/lib/registrationRequest.ts';
const applicant = { userId:'owner', name:'Owner', city:'上海', skills:[], email:'owner@example.com', bio:'Builder', organization:'示例学校', position:'大三', age:21 };
const row = { ownerUserId:'owner', makerId:'M1', applicant, members:[{id:'owner',name:'Owner',isLeader:true}], projectName:'Project', projectSummary:'Summary', teamName:'Team', track:'creator', type:'individual', status:'submitted', submittedAt:'2026-10-29T00:00:00Z',videoUrl:'',docUrl:'' };
test('age and affiliation reject malformed or partial profiles',()=>{
 for (const age of [0,-1,151,2.5,'21',true,null,NaN]) assert.equal(validApplicantAge(age),false);
 assert.equal(validApplicantProfile(applicant),true);
 for(const field of ['organization','position','age']){const input={...applicant};delete input[field];assert.equal(validApplicantProfile(input),false);}
 assert.equal(validApplicantProfile({...applicant,organization:' '.repeat(3)}),false);
});
test('saved profile is private, validates types, and historical snapshots remain readable',()=>{
 assert.deepEqual(registrationApplicant(row),applicant);
 assert.equal(registrationApplicant({...row,applicant:{...applicant,age:'21'}}),null);
 const legacy={...applicant};delete legacy.organization;delete legacy.position;delete legacy.age;
 assert.deepEqual(registrationApplicant({...row,applicant:legacy}),legacy);
 assert.equal(registrationApplicant({...row,ownerUserId:'other'}),null);
});
test('new profile fields are part of retry content matching and CSV escapes organization text',()=>{
 for(const update of [{age:22},{organization:'另一所学校'},{position:'研一'}]) assert.notEqual(registrationContentKey(row,'owner'),registrationContentKey({...row,applicant:{...applicant,...update}},'owner'));
 const csv=registrationCSV([{...row,applicant:{...applicant,organization:'=INJECT()'}}]);
 for(const label of ['公司／学校／机构组织名称','职位／在读年级','年龄'])assert.ok(csv.includes(label));
 assert.ok(csv.includes("'=INJECT()"));assert.ok(csv.includes('"21"'));
});
test('old backend capability cannot silently discard the new profile fields',async()=>{
 const original=globalThis.fetch;let posts=0;
 globalThis.fetch=async(input,init)=>{if(init.method==='POST')posts++;const key=decodeURIComponent(new URL(input,'http://local').searchParams.get('__p')?.split('/').at(-1)||new URL(input,'http://local').pathname.split('/').at(-1));return new Response(JSON.stringify({ok:true,userId:'owner',requestKey:key,found:false,contactPolicy:'account',applicantPolicy:'snapshot-v2'}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{await assert.rejects(saveRegistration(row,'owner',()=>true),/新增报名资料保存服务尚未就绪/);assert.equal(posts,0);}finally{globalThis.fetch=original;}
});
