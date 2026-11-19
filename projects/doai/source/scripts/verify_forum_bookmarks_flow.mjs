import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
// Every API and clipboard write is intercepted; no production data or real clipboard changes.
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
await page.evaluateOnNewDocument(()=>{
 Date.now=()=>Date.parse('2026-11-01T00:00:00Z');window.__copyMode='fail';
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedValue=value;if(window.__copyMode==='fail')throw new Error('Clipboard blocked');if(window.__copyMode==='hold')await new Promise(resolve=>{window.__releaseCopy=resolve;});}}});
});
let account='a',signedIn=false,listMode='fail',mutationMode='malformed',writes=0,heldMutation,heldList,holdList=false,wrongOwner=false;
const saved={a:[],b:[]};
await page.setRequestInterception(true);
page.on('request',request=>{
 const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
 const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
 const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
 if(route==='/api/user/me')return signedIn?reply({id:account,name:`Account ${account}`,phone:'13800000000'}):reply({message:'Sign in'},401);
 if(route==='/api/doai/me')return reply({isAdmin:false});
 if(route==='/api/auth/login'){signedIn=true;return reply({token:`mock-token-${account}`});}
 if(route==='/api/auth/logout'){signedIn=false;return reply({ok:true});}
 if(route==='/api/doai/forum-bookmarks'&&request.method()==='GET'){
  const owner=account,rows=structuredClone(saved[owner]);
  if(holdList){holdList=false;heldList=()=>reply({ok:true,userId:owner,bookmarks:rows});return;}
  if(listMode==='fail')return reply({message:'Bookmarks unavailable'},503);
  return reply({ok:true,userId:wrongOwner?'other-account':owner,bookmarks:rows});
 }
 if(route==='/api/doai/forum-bookmarks'){
  writes++;const owner=account,input=JSON.parse(request.postData());assert.equal(input.expectedUserId,owner);
  if(mutationMode==='malformed')return reply({ok:true});
  if(mutationMode==='fail')return reply({message:'本地收藏保存失败'},503);
  if(mutationMode==='expired')return reply({message:'请重新登录'},401);
  const complete=()=>{
   let row=saved[owner].find(row=>row.id===input.id);
   if(input.saved&&!row){row={id:input.id,createdAt:'2026-11-01T00:00:00.000Z'};saved[owner].push(row);}
   if(!input.saved)saved[owner]=saved[owner].filter(row=>row.id!==input.id);
   return reply({ok:true,userId:owner,bookmark:{id:input.id,saved:input.saved,...(input.saved?{createdAt:row.createdAt}:{})}});
  };
  if(mutationMode==='hold'){heldMutation=complete;return;}return complete();
 }
 if(route==='/api/doai/forum-stats')return reply({ok:true,forums:Array.from({length:18},(_,index)=>({id:`forum-${index+1}`,bookedCount:0,checkedInCount:0}))});
 for(const key of ['registrations','cards','notifications','tickets','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
 if(route==='/api/doai/site-config')return reply({config:null});return reply({ok:true});
});
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
const go=route=>page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});
const route=path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`${new URL(site).pathname}/${path}`);
const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`Missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
const wait=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw new Error('Expected intercepted request missing');await new Promise(resolve=>setTimeout(resolve,10));}};
const login=async id=>{account=id;await page.waitForSelector('#atomclub-phone');await page.type('#atomclub-phone','13800000000');await page.type('#atomclub-code','123456');await page.click('[role="dialog"] input[type="checkbox"]');await click('登录 / 注册');await page.waitForSelector(`img[alt="Account ${id}"]`);};
try{
 await go('detail/forum/forum-1');await text('收藏');await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='收藏'&&!node.disabled));await click('收藏');await page.waitForSelector('#atomclub-phone');assert.equal(writes,0);await login('a');
 await text('收藏暂时无法读取');listMode='ok';await click('重新加载收藏');await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='收藏'&&!node.disabled));
 await click('收藏');await text('收藏保存结果未确认');assert.equal(saved.a.length,0);
 mutationMode='fail';await click('收藏');await text('本地收藏保存失败');
 mutationMode='hold';const before=writes;await page.evaluate(()=>{const node=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='收藏');node.click();node.click();});await wait(()=>heldMutation);assert.equal(writes,before+1);
 const initialSave=heldMutation;await route('detail/forum/forum-2');await text('DOAI 创投引力场');await initialSave();
 assert.equal(await page.$$eval('button[aria-pressed="true"]',nodes=>nodes.filter(node=>node.textContent.trim()==='已收藏').length),0);
 await route('detail/forum/forum-1');await text('已收藏');await page.reload({waitUntil:'domcontentloaded'});await text('已收藏');
 console.log('PASS: anonymous saves require login, failed/malformed writes never mark saved, duplicates are locked and saved bookmarks survive navigation/reload without leaking the old forum state');

 await route('dashboard/passport');await text('收藏的论坛');await click('收藏的论坛');await page.waitForFunction(()=>location.pathname.endsWith('/dashboard/bookmarks'));await text('AI 人才趋势、组织变革、大学生求职');
 mutationMode='fail';await click('取消收藏');await text('本地收藏保存失败');assert.equal(saved.a.length,1);
 mutationMode='hold';heldMutation=null;await click('取消收藏');await wait(()=>heldMutation);const remove=heldMutation;holdList=true;await click('刷新收藏');await wait(()=>heldList);const staleList=heldList;
 await remove();await staleList();await text('还没有收藏的分论坛');await page.reload({waitUntil:'domcontentloaded'});await text('还没有收藏的分论坛');
 mutationMode='ok';await route('detail/forum/forum-1');await text('收藏');await click('收藏');await text('已收藏');
 console.log('PASS: My DOAI saved-forum tab has a persistent URL, removal failure keeps the card, and an older refresh cannot restore a confirmed removal');

 await click('分享场次');await text('复制失败');const canonical=`${site}/detail/forum/forum-1`;assert.equal(await page.$eval('input[aria-label="场次分享链接"]',node=>node.value),canonical);
 assert.equal(await page.$eval('input[aria-label="场次分享链接"]',node=>node.selectionEnd-node.selectionStart),canonical.length);
 await page.evaluate(()=>{window.__copyMode='ok';});await click('分享场次');await text('已复制');assert.ok((await page.evaluate(()=>window.__copiedValue)).endsWith(`\n${canonical}`));
 await page.evaluate(()=>{window.__copyMode='hold';});await page.click('button[aria-label="分享场次"]');await page.waitForFunction(()=>typeof window.__releaseCopy==='function');await route('detail/forum/forum-2');await text('DOAI 创投引力场');await page.evaluate(()=>window.__releaseCopy());
 assert.equal(await page.$('input[aria-label="场次分享链接"]'),null);assert.equal(await page.$$eval('button',nodes=>nodes.filter(node=>node.textContent.trim()==='已复制').length),0);
 await page.setViewport({width:390,height:844});await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});});await click('分享场次');await text('复制失败');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/tmp/doai-forum-share-mobile.png'});await page.setViewport({width:1440,height:960});
 console.log('PASS: share includes an openable canonical link, clipboard denial offers selected manual-copy text and late copy feedback cannot affect another forum');

 await route('dashboard/bookmarks');await text('AI 人才趋势、组织变革、大学生求职');mutationMode='hold';heldMutation=null;await click('取消收藏');await wait(()=>heldMutation);const oldRemove=heldMutation;holdList=true;heldList=null;await click('刷新收藏');await wait(()=>heldList);const oldRead=heldList;
 await click('资料与隐私');await text('退出登录');await click('退出登录');await page.waitForFunction(()=>!document.querySelector('img[alt="Account a"]'));await route('dashboard/bookmarks');await text('使用原子公社账号登录');await click('使用原子公社账号登录');await login('b');await text('还没有收藏的分论坛');
 await route('detail/forum/forum-2');await text('收藏');heldMutation=null;await click('收藏');await wait(()=>heldMutation);const newSave=heldMutation;
 await oldRemove();await oldRead();await text('正在保存收藏');await newSave();await text('已收藏');await route('dashboard/bookmarks');await text('融资策略、资本周期、投后陪跑');
 assert.equal((await page.$eval('section[aria-label="收藏的论坛"]',node=>node.textContent)).includes('大学生求职'),false);
 await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/tmp/doai-bookmarks-mobile.png'});
 mutationMode='expired';await route('detail/forum/forum-3');await text('收藏');await click('收藏');await text('登录已过期');await login('b');assert.equal(saved.b.some(row=>row.id==='forum-3'),false);await route('dashboard/bookmarks');await text('融资策略、资本周期、投后陪跑');
 wrongOwner=true;await click('刷新收藏');await text('登录状态已变化');await page.waitForSelector('#atomclub-phone');assert.deepEqual(errors,[]);
 console.log('PASS: old-account reads/removals cannot replace or unlock a new account save; wrong-identity reads clear private state and require sign-in');
}finally{await browser.close();}
