import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, apiFetch } from '../src/lib/api.ts';
import { loginAtomclub, confirmAtomclubLogin, hasPendingAtomclubLogin, logoutAtomclub } from '../src/lib/atomclubAuth.ts';
import { bindDoaiActor, ANONYMOUS_ACTOR, currentAuthToken } from '../src/lib/authSession.ts';
const reply = (data, status=200) => new Response(JSON.stringify(data), {status});
const fixture = async work => {
  const oldFetch=globalThis.fetch, descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), rows=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)}});
  bindDoaiActor(ANONYMOUS_ACTOR);
  try { await work(rows); } finally { globalThis.fetch=oldFetch; bindDoaiActor(null); if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage; }
};
test('account confirmation failure is recoverable without resubmitting a consumed OTP',async()=>fixture(async rows=>{
  let logins=0, unavailable=true;
  globalThis.fetch=async input=>{
    if(String(input).includes('__p=login')) { logins++; return reply({token:'qa-recovery'}); }
    if(String(input).startsWith('/api/user'))return unavailable?reply({message:'Temporary failure'},503):reply({id:'qa-user'});
    return reply({isAdmin:false,profile:{userId:'qa-user'}});
  };
  await assert.rejects(loginAtomclub('13800000000','123456'),/Temporary failure/);
  assert.equal(hasPendingAtomclubLogin(),true);assert.equal(currentAuthToken(),'qa-recovery');
  unavailable=false;assert.equal((await confirmAtomclubLogin()).id,'qa-user');
  assert.equal(logins,1);assert.equal(hasPendingAtomclubLogin(),false);
}));
test('a confirmation started before logout cannot revive that account',async()=>fixture(async rows=>{
  rows.set('user_token','qa-a');rows.set('doai_login_pending','attempt-a');
  let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
  const pending=confirmAtomclubLogin();
  globalThis.fetch=async()=>reply({ok:true});await logoutAtomclub();
  release(reply({id:'a'}));await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');
  assert.equal(currentAuthToken(),null);assert.equal(hasPendingAtomclubLogin(),false);
}));
test('unconfirmed logout survives a module reload and a successful retry removes the recovery marker',async()=>fixture(async rows=>{
  rows.set('user_token','qa-a');bindDoaiActor('a','qa-a');
  globalThis.fetch=async()=>reply({message:'Unavailable'},503);
  await assert.rejects(logoutAtomclub());assert.equal(rows.get('doai_logout_pending'),'1');assert.equal(currentAuthToken(),null);
  const reloaded=await import(`../src/lib/authSession.ts?recovery=${Date.now()}`);
  assert.equal(reloaded.explicitlySignedOut(),true);
  globalThis.fetch=async()=>reply({ok:true});await logoutAtomclub();assert.equal(rows.has('doai_logout_pending'),false);
}));
test('hung requests report timeout and caller cancellation is preserved',async()=>fixture(async()=>{
  const original=AbortSignal.timeout;
  try {
    let controller;
    AbortSignal.timeout=()=>{controller=new AbortController();return controller.signal;};
    globalThis.fetch=async(_input,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
    const pending=apiRequest('/api/user/me');controller.abort(new DOMException('Timed out','TimeoutError'));
    await assert.rejects(pending,error=>error.code==='REQUEST_TIMEOUT');
    const caller=new AbortController();const cancelled=apiFetch('/api/user/me',{signal:caller.signal});caller.abort();
    await assert.rejects(cancelled,error=>error.name==='AbortError');
  } finally { AbortSignal.timeout=original; }
}));
test('timeout while consuming a response body is actionable',async()=>fixture(async()=>{
  globalThis.fetch=async()=>({json:async()=>{throw new DOMException('Timed out','TimeoutError');}});
  await assert.rejects(apiRequest('/api/user/me'),error=>error.code==='REQUEST_TIMEOUT');
}));
