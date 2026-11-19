import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
// All account/SMS APIs are intercepted. Storage restrictions are simulated locally.
try{
 for(const mode of ['property','methods','quota','invalid-language','english']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.evaluateOnNewDocument(mode=>{
   if(mode==='invalid-language')localStorage.setItem('doai_lang','unsupported-language');
   if(mode==='english')localStorage.setItem('doai_lang','en');
   const denied=()=>{throw new DOMException('Storage blocked','SecurityError');};
   if(mode==='property')Object.defineProperty(window,'localStorage',{configurable:true,get:denied});
   if(mode==='methods')for(const name of ['getItem','setItem','removeItem'])Storage.prototype[name]=denied;
   if(mode==='quota')Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError');};
  },mode);
  let authorizedReads=0;
  await page.setRequestInterception(true);
  page.on('request',request=>{
   const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
   const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
   const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
   const authenticated=request.headers().authorization==='Bearer qa-storage-token';
   if(route==='/api/auth/login')return reply({token:'qa-storage-token'});
   if(route==='/api/auth/logout')return reply({ok:true});
   if(route==='/api/user/me'){if(authenticated)authorizedReads++;return authenticated?reply({id:'storage-user',name:'Storage QA',phone:'13800000000'}):reply({message:'Sign in'},401);}
   if(route==='/api/doai/me')return reply({isAdmin:false,profile:{userId:'storage-user',isPublic:false,allowCardExchange:false}});
   if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:'storage-user',bookmarks:[]});
   if(route==='/api/doai/forum-stats')return reply({ok:true,forums:Array.from({length:18},(_,index)=>({id:`forum-${index+1}`,bookedCount:0,checkedInCount:0}))});
   for(const key of ['registrations','cards','notifications','tickets','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
   if(route==='/api/doai/site-config')return reply({config:null});return reply({ok:true});
  });
  const route=path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`${new URL(site).pathname}/${path}`);
  const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`${mode}: missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
  await page.goto(`${site}/forum`,{waitUntil:'domcontentloaded'});await page.waitForSelector('main h1');
  await page.waitForFunction(expected=>document.documentElement.lang===expected,{},mode==='english'?'en':'zh-CN');
  assert.equal((await page.$eval('body',node=>node.textContent)).includes('页面渲染时出现异常'),false);
  if(mode!=='english'){await page.click('button[aria-label="Switch to English"]');await page.waitForFunction(()=>document.documentElement.lang==='en');}
  await route('dashboard/settings');await page.waitForFunction(()=>document.body.textContent.includes('Sign in with AtomClub'));await click('Sign in with AtomClub');
  await page.waitForSelector('#atomclub-phone');await page.type('#atomclub-phone','13800000000');await page.type('#atomclub-code','123456');await page.click('[role="dialog"] input[type="checkbox"]');await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForSelector('img[alt="Storage QA"]');assert.ok(authorizedReads>0,`${mode}: login must authenticate with the returned token`);
  await click('Sign Out');await page.waitForFunction(()=>!document.querySelector('img[alt="Storage QA"]'));
  assert.deepEqual(errors,[]);console.log(`PASS: ${mode} storage does not break rendering, document language, language toggle, current-document token login or logout`);await page.close();
 }
}finally{await browser.close();}
