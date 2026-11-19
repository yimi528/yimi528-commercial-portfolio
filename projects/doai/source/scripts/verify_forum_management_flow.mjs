import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://127.0.0.1:3218/doai';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,defaultViewport:{width:1440,height:1000}});
const page=await browser.newPage(),errors=[]; page.on('pageerror',error=>errors.push(String(error)));
await page.evaluateOnNewDocument(()=>{if(!localStorage.getItem('doai_lang'))localStorage.setItem('doai_lang','zh');});
let forums=[],version=null,tickets=[],failure=false,publicFailure=false;
const id='session-11111111-1111-1111-1111-111111111111';
const enriched=rows=>rows.map(f=>({...f,bookedCount:tickets.filter(t=>t.bookingKey===`forum:${f.id}`).length,checkedInCount:0}));
await page.setRequestInterception(true);page.on('request',request=>{
 const url=new URL(request.url()); if(url.origin!==new URL(site).origin)return request.abort(); if(!url.pathname.includes('/api/'))return request.continue();
 const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
 const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
 if(route==='/api/user/me')return reply({id:'forum-admin',name:'Forum Admin',phone:'13800000000'});
 if(route==='/api/doai/me')return reply({isAdmin:true});
 if(route==='/api/doai/admin/forums'&&request.method()==='GET')return reply({ok:true,forums:enriched(forums),version});
 if(route.startsWith('/api/doai/admin/forums')) {
  if(failure)return reply({message:'测试保存失败，请重试'},503);
  const body=JSON.parse(request.postData()); if(body.expectedVersion!==version)return reply({message:'场次已被其他管理员修改，请重新加载后再保存'},409);
  const f=body.forum;
  if(request.method()==='DELETE')forums=forums.filter(row=>row.id!==f.id);
  else { const saved={...f,id:f.id||id,date:f.startsAt.slice(0,10),time:`${f.startsAt.slice(11,16)} - ${f.endsAt.slice(11,16)}`,status:'upcoming',cancellationDeadline:'2026-12-04T02:00:00Z'}; for(const key of ['title','track','venue','description'])saved[`${key}En`] ||=saved[key]; forums=[...forums.filter(row=>row.id!==saved.id),saved]; }
  version=new Date(Date.parse(version||'2026-10-01')+1).toISOString();return reply({ok:true,forums:enriched(forums),version});
 }
 if(route==='/api/doai/forums')return publicFailure?reply({message:'读取失败'},503):reply({ok:true,forums:enriched(forums.filter(f=>f.publication==='published'))});
 if(route==='/api/doai/forum-stats')return reply({ok:true,forums:enriched(forums.filter(f=>f.publication==='published')).map(f=>({id:f.id,bookedCount:f.bookedCount,checkedInCount:0}))});
 if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:'forum-admin',bookmarks:[]});
 if(route==='/api/doai/tickets'&&request.method()==='GET')return reply({tickets});
 if(route==='/api/doai/tickets') {const f=forums[0];tickets=[{id:'test-ticket',ownerUserId:'forum-admin',bookingKey:`forum:${f.id}`,type:'forum',status:'claimed',title:f.title,venue:f.venue,startsAt:f.startsAt,endsAt:f.endsAt,qrCode:'QA',issuedAt:'2026-10-30',holderName:'QA'}];return reply({ticket:tickets[0]});}
 if(route.startsWith('/api/doai/tickets/')&&request.method()==='DELETE'){tickets=[];return reply({ok:true});}
 if(route==='/api/doai/site-config')return reply({config:null});
 for(const key of ['registrations','cards','notifications','recruitments','talents','teams'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
 return reply({ok:true});
});
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
const click=async label=>{await page.waitForFunction(label=>[...document.querySelectorAll('button')].some(n=>n.textContent.trim()===label&&!n.disabled),{},label);const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===label&&!n.disabled),label);assert.ok(handle.asElement(),`Missing enabled button: ${label}`);await handle.asElement().evaluate(n=>n.click());await handle.dispose();};
const go=route=>page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});
const fill=async(name,value)=>{await page.$eval(`form[aria-label="场次编辑"] [name="${name}"]`,(n,value)=>{const setter=Object.getOwnPropertyDescriptor(n.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}));},value);};
try {
 await go('admin');await text('组委会管理中枢');await click('论坛场次管理');await text('创建第一场论坛');await click('新增场次');
 await fill('title','AI 产品实践论坛');await fill('track','产品实践');await fill('venue','乐动虹桥 · 交流厅');await fill('description','分享从原型到产品的实践经验。');await fill('startsAt','2026-12-06T10:00');await fill('endsAt','2026-12-06T12:00');await fill('capacity','2');await page.click('input[name="bookingEnabled"]');
 failure=true;await click('保存场次');await text('测试保存失败，请重试');assert.equal(await page.$eval('input[name="title"]',n=>n.value),'AI 产品实践论坛');failure=false;
 await click('保存场次');await text('场次已保存');await page.waitForSelector('[data-forum-id]');assert.equal(forums[0].publication,'draft');
 await click('发布场次');await page.waitForFunction(()=>document.querySelector('[data-forum-id]').textContent.includes('已发布'));
 await page.screenshot({path:'/tmp/doai-forum-management-desktop.png',fullPage:true});
 await go('forum');await text('AI 产品实践论坛');await text('限 2 人');await click('免费预约');await text('已预约');assert.equal(tickets.length,1);
 await go(`detail/forum/${id}`);await text('产品实践');await text('限 2 人');
 await go('admin');await click('论坛场次管理');await text('已预约：1 / 2');await click('暂停预约');await text('预约已暂停');
 await click('编辑');await fill('description','更新后的论坛介绍');version=new Date(Date.parse(version)+1).toISOString();await click('保存场次');await text('场次已被其他管理员修改');assert.equal(await page.$eval('textarea[name="description"]',n=>n.value),'更新后的论坛介绍');await click('重新加载场次');await page.waitForFunction(()=>!document.body.textContent.includes('场次已被其他管理员修改'));await click('保存场次');await text('场次已保存');
 await click('下架场次');await page.waitForFunction(()=>document.querySelector('[data-forum-id]').textContent.includes('前台隐藏'));
 await go('forum');await text('分论坛排期待公布');await go('dashboard/passport');await text('取消论坛预约');await click('取消论坛预约');await page.waitForFunction(()=>![...document.querySelectorAll('[data-testid="digital-ticket"]')].some(n=>n.textContent.includes('AI 产品实践论坛')));assert.equal(tickets.length,0);
 await go('admin');await click('论坛场次管理');await text('已预约：0 / 2');await click('编辑');await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/tmp/doai-forum-management-mobile.png',fullPage:true});await click('取消编辑');await click('删除草稿');await click('确认删除');await text('创建第一场论坛');
 publicFailure=true;await go('forum');await text('场次暂时无法加载');publicFailure=false;await click('重新加载');await text('分论坛排期待公布');
 await page.setViewport({width:1440,height:1000});await page.evaluate(()=>localStorage.setItem('doai_lang','en'));await go('admin');await click('Forums');await text('Create your first forum');assert.deepEqual(errors,[]);
 console.log('PASS: browser create/edit, failed-save retention, publish, public list/detail, reserve, pause, stale editor/reload, unpublish, passport cancellation, delete, read retry, English and 390px mobile layout.');
}catch(error){console.error('UI:',await page.$eval('main',n=>n.textContent));console.error('FIXTURES:',JSON.stringify({forums,version}));await page.screenshot({path:'/tmp/doai-forum-management-error.png',fullPage:true});throw error;}finally{await browser.close();}
