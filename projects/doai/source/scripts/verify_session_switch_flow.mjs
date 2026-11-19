import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { forums as publishedForums } from '../src/data/plan.ts';
const hasForum = publishedForums.length > 0;
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
// All endpoints and the storage-helper document are local mocks. No real account changes.
async function scenario(initialToken='qa-a',initialCookie=null){
 const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
 const state={cookie:initialCookie,expired:false,holdIdentity:null,identities:[],holdCards:false,heldCards:null,holdLogin:false,heldLogin:null,loginToken:'qa-a',holdLogout:false,heldLogout:null,logoutFail:false,writes:[],requests:[],tickets:{a:[],b:[]},reads:0};
 page.on('pageerror',error=>errors.push(String(error)));
 await page.evaluateOnNewDocument(token=>{Date.now=()=>Date.parse('2026-11-01T00:00:00Z');localStorage.setItem('doai_lang','zh');if(token)localStorage.setItem('user_token',token);},initialToken);
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
  const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
  const auth=request.headers().authorization,owner=state.expired?null:auth==='Bearer qa-a'?'a':auth==='Bearer qa-b'?'b':auth?null:state.cookie;
  const expected=request.headers()['x-doai-actor'];state.requests.push({route,expected,owner});const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  const pure=['/api/doai/me','/api/doai/site-config','/api/doai/forum-stats','/api/doai/users','/api/doai/teams'].includes(route);
  if(route.startsWith('/api/doai/')&&!pure&&expected&&!['__anonymous__','__pending__'].includes(expected)&&expected!==owner)return reply({error:{code:owner?'DOAI_SESSION_CHANGED':'DOAI_SESSION_EXPIRED',message:'登录账号已变化，操作未执行'}},owner?409:401);
  if(route==='/api/user/me'){
   state.reads++;if(!owner)return reply({message:'Sign in'},401);
   const complete=()=>reply({id:owner,name:`Account ${owner}`,phone:'13800000000',city:'上海'});
   if(state.holdIdentity===owner){state.identities.push(complete);return;}return complete();
  }
  if(route==='/api/doai/me')return owner?reply({isAdmin:false,profile:{userId:owner,isPublic:false,allowCardExchange:false}}):reply({message:'Sign in'},401);
  if(route==='/api/auth/login'){const token=state.loginToken,complete=()=>reply({token});if(state.holdLogin){state.heldLogin=complete;return;}return complete();}
  if(route==='/api/auth/logout'){if(state.logoutFail)return reply({message:'Logout unavailable'},503);const complete=()=>reply({ok:true});if(state.holdLogout){state.heldLogout=complete;return;}return complete();}
  if(route==='/api/doai/my-team')return reply({ok:true,userId:owner,team:null});
  if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:owner,bookmarks:[]});
  if(route==='/api/doai/forum-stats')return reply({ok:true,forums:Array.from({length:18},(_,index)=>({id:`forum-${index+1}`,bookedCount:0,checkedInCount:0}))});
  if(route==='/api/doai/tickets'&&request.method()==='POST'){
   state.writes.push({owner,expected});const input=JSON.parse(request.postData()),ticket={...input,id:`pass-${owner}`,type:'forum',ownerUserId:owner,holderName:owner,holderPhone:'13800000000',status:'claimed',qrCode:`QA-${owner}`,issuedAt:'2026-11-01'};state.tickets[owner].push(ticket);return reply({ticket});
  }
  if(route==='/api/doai/tickets')return reply({tickets:owner?state.tickets[owner]:[]});
  if(route==='/api/doai/cards'&&state.holdCards&&owner==='a'){state.heldCards=()=>reply({message:'Old session expired'},401);return;}
  for(const key of ['cards','notifications','registrations','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
  if(route==='/api/doai/site-config')return reply({config:null});return reply({ok:true});
 });
 const other=await context.newPage();await other.setRequestInterception(true);other.on('request',request=>request.respond({status:200,contentType:'text/html',body:'<!doctype html><title>Local auth helper</title>'}));await other.goto(`${new URL(site).origin}/auth-helper`);await page.bringToFront();
 const text=async value=>{try{await page.waitForFunction(value=>document.body.textContent.includes(value),{},value);}catch(error){console.log('Missing text:',value,'requests:',state.requests,'body:',await page.$eval('main',node=>node.textContent.slice(0,1700)));throw error;}};
 const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`Missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
 const fillApplicant=async()=>{for(const [id,value] of Object.entries({'registration-email':'qa@example.com','registration-bio':'QA applicant introduction','registration-organization':'QA organization','registration-position':'Engineer','registration-age':'25'}))await page.type(`#${id}`,value);};
 const go=route=>page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});
 const route=path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`${new URL(site).pathname}/${path}`);
 const wait=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw new Error('Expected intercepted request missing');await new Promise(resolve=>setTimeout(resolve,10));}};
 const releaseIdentity=async()=>{state.holdIdentity=null;for(const release of state.identities.splice(0))await release();};
 return{context,page,other,state,errors,text,click,fillApplicant,go,route,wait,releaseIdentity};
}
try{
 if (!hasForum) console.log('SKIP: 3 booking-session scenarios require a published forum; the current forum list is empty');
 if (hasForum) {
  const s=await scenario();try{
   await s.go('detail/forum/forum-1');await s.page.waitForSelector('img[alt="Account a"]');await s.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='免费预约'&&!node.disabled));s.state.holdIdentity='b';
   await s.other.evaluate(()=>localStorage.setItem('user_token','qa-b'));await s.wait(()=>s.state.identities.length>0);assert.equal(await s.page.$('img[alt="Account a"]'),null);
   await s.page.$$eval('main button',nodes=>nodes.filter(node=>node.textContent.includes('正在处理')).forEach(node=>node.click()));assert.equal(s.state.writes.length,0);
   await s.releaseIdentity();await s.page.waitForSelector('img[alt="Account b"]');await s.text('免费预约');assert.equal(s.state.writes.length,0);await s.click('免费预约');await s.text('已预约 · 点击取消');assert.deepEqual(s.state.writes,[{owner:'b',expected:'b'}]);assert.deepEqual(s.errors,[]);
   console.log('PASS: native cross-tab token change clears the old identity, holds actions until verification and never auto-replays the old booking');
  }finally{await s.context.close();}
 }
 if (hasForum) {
  const s=await scenario();try{
   await s.go('detail/forum/forum-1');await s.page.waitForSelector('img[alt="Account a"]');await s.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='免费预约'&&!node.disabled));s.state.holdIdentity='b';
   await s.page.evaluate(()=>{localStorage.setItem('user_token','qa-b');[...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='免费预约').click();});await s.wait(()=>s.state.identities.length>0);assert.equal(s.state.writes.length,0);
   await s.releaseIdentity();await s.page.waitForSelector('img[alt="Account b"]');assert.equal(s.state.writes.length,0);assert.deepEqual(s.errors,[]);
   console.log('PASS: same-document token drift blocks the write before fetch even without a storage event');
  }finally{await s.context.close();}
 }
 if (hasForum) {
  const s=await scenario(null,'a');try{
   await s.go('detail/forum/forum-1');await s.page.waitForSelector('img[alt="Account a"]');await s.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='免费预约'&&!node.disabled));s.state.cookie='b';s.state.holdIdentity='b';await s.click('免费预约');await s.wait(()=>s.state.identities.length>0);assert.equal(s.state.writes.length,0);await s.releaseIdentity();await s.page.waitForSelector('img[alt="Account b"]');assert.deepEqual(s.errors,[]);
   console.log('PASS: cookie-only account drift is rejected by the expected-actor protocol before a booking can mutate');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   s.state.holdCards=true;await s.go('dashboard/passport');await s.page.waitForSelector('img[alt="Account a"]');await s.wait(()=>s.state.heldCards);await s.other.evaluate(()=>localStorage.setItem('user_token','qa-b'));await s.page.waitForSelector('img[alt="Account b"]');await s.state.heldCards();await s.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await s.page.$('img[alt="Account b"]'));assert.equal(await s.page.$('#atomclub-phone'),null);
   await s.other.evaluate(()=>{localStorage.removeItem('user_token');localStorage.removeItem('atomhub_user_token');});await s.page.waitForFunction(()=>!document.querySelector('img[alt="Account b"]'));const reads=s.state.reads;await s.page.bringToFront();await s.page.evaluate(()=>dispatchEvent(new Event('focus')));await s.page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));assert.equal(s.state.reads,reads);assert.deepEqual(s.errors,[]);
   console.log('PASS: a late 401 from A cannot log out B, and remote logout stays signed out on focus');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario(null);try{
   await s.go('dashboard/settings');await s.text('使用原子公社账号登录');await s.click('使用原子公社账号登录');await s.page.type('#atomclub-phone','13800000000');await s.page.type('#atomclub-code','123456');await s.page.click('[role="dialog"] input[type="checkbox"]');s.state.holdLogin=true;await s.click('登录 / 注册');await s.wait(()=>s.state.heldLogin);await s.other.evaluate(()=>localStorage.setItem('user_token','qa-b'));await s.page.waitForSelector('img[alt="Account b"]');await s.state.heldLogin();await s.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await s.page.evaluate(()=>localStorage.getItem('user_token')),'qa-b');assert.ok(await s.page.$('img[alt="Account b"]'));assert.deepEqual(s.errors,[]);
   console.log('PASS: a late OTP login result cannot overwrite the newer token or reopen the old dialog');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   await s.go('dashboard/settings');await s.page.waitForSelector('img[alt="Account a"]');s.state.holdLogout=true;await s.click('退出登录');await s.wait(()=>s.state.heldLogout);assert.equal(s.state.requests.find(row=>row.route==='/api/auth/logout').expected,'a');await s.other.evaluate(()=>localStorage.setItem('user_token','qa-b'));await s.page.waitForSelector('img[alt="Account b"]');await s.state.heldLogout();await s.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await s.page.evaluate(()=>localStorage.getItem('user_token')),'qa-b');assert.ok(await s.page.$('img[alt="Account b"]'));assert.deepEqual(s.errors,[]);
   console.log('PASS: an old pending logout cannot remove or replace a newly synchronized account');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   await s.go('dashboard/settings');await s.page.waitForSelector('img[alt="Account a"]');s.state.holdLogout=true;await s.click('退出登录');await s.wait(()=>s.state.heldLogout);await s.route('dashboard/settings');await s.text('使用原子公社账号登录');await s.click('使用原子公社账号登录');await s.page.type('#atomclub-phone','13800000000');await s.page.type('#atomclub-code','123456');await s.page.click('[role="dialog"] input[type="checkbox"]');s.state.holdLogin=true;s.state.loginToken='qa-b';await s.click('登录 / 注册');await s.wait(()=>s.state.heldLogin);
   await s.state.heldLogout();await s.state.heldLogin();await s.page.waitForSelector('img[alt="Account b"]');assert.equal(await s.page.evaluate(()=>localStorage.getItem('user_token')),'qa-b');assert.deepEqual(s.errors,[]);
   console.log('PASS: cleanup from the previous logout does not reject a fresh login started on the signed-out page');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   await s.go('dashboard/passport');await s.page.waitForSelector('img[alt="Account a"]');await s.page.click('button[aria-label="Switch to English"]');await s.page.waitForFunction(()=>document.documentElement.lang==='en');s.state.expired=true;await s.page.click('button[aria-label="Notifications"]');await s.text('Your sign-in has expired');await s.page.waitForSelector('#atomclub-phone');assert.equal(await s.page.$('img[alt="Account a"]'),null);assert.deepEqual(s.errors,[]);
   console.log('PASS: an expired current session clears private state and shows sign-in recovery in the current language');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   await s.go('dashboard/settings');await s.page.waitForSelector('img[alt="Account a"]');s.state.logoutFail=true;await s.click('退出登录');await s.text('服务器会话清理未确认');assert.equal(await s.page.$('img[alt="Account a"]'),null);const reads=s.state.reads;await s.page.evaluate(()=>dispatchEvent(new Event('focus')));await s.page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));assert.equal(s.state.reads,reads);assert.deepEqual(s.errors,[]);
   console.log('PASS: failed server logout clears this page, reports unconfirmed remote cleanup and does not silently sign back in');
  }finally{await s.context.close();}
 }
 {
  const s=await scenario();try{
   await s.go('register');await s.page.waitForSelector('img[alt="Account a"]');await s.fillApplicant();await s.click('下一步：参赛模式');await s.page.waitForSelector('#registration-team-name');await s.page.type('input[placeholder="例如: Synapse Core"]','A private team');await s.click('下一步：项目与作品');await s.page.waitForSelector('input[placeholder="例如: NeuroFlow 自适应多智能体协作中枢"]');
   await s.page.type('input[placeholder="例如: NeuroFlow 自适应多智能体协作中枢"]','A private project');await s.page.type('textarea','A private project summary');await s.other.evaluate(()=>localStorage.setItem('user_token','qa-b'));await s.page.waitForSelector('img[alt="Account b"]');
   await s.page.waitForFunction(()=>document.querySelector('input[placeholder="请输入姓名"]')?.value==='Account b');assert.equal(await s.page.$eval('#registration-email',node=>node.value),'');assert.equal(await s.page.$eval('#registration-bio',node=>node.value),'');await s.fillApplicant();await s.click('下一步：参赛模式');await s.page.waitForSelector('#registration-team-name');assert.equal(await s.page.$eval('input[placeholder="例如: Synapse Core"]',node=>node.value),'');
   await s.page.type('input[placeholder="例如: Synapse Core"]','B fresh team');await s.click('下一步：项目与作品');await s.page.waitForSelector('input[placeholder="例如: NeuroFlow 自适应多智能体协作中枢"]');assert.equal(await s.page.$eval('input[placeholder="例如: NeuroFlow 自适应多智能体协作中枢"]',node=>node.value),'');assert.equal(await s.page.$eval('textarea',node=>node.value),'');assert.deepEqual(s.errors,[]);
   console.log('PASS: account switching resets private registration team/project drafts before the next account can use them');
  }finally{await s.context.close();}
 }
}finally{await browser.close();}
