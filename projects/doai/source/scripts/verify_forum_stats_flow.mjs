import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{Date.now=()=>Date.parse('2026-11-01T00:00:00Z');});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
let mode='hold-first',statsReads=0,heldStats,cancelMode='fail',account='holder',admin=false,signedIn=true;
let tickets=[];
const statistics=()=>Array.from({length:18},(_,index)=>{
 const id=`forum-${index+1}`,active=tickets.filter(row=>row.bookingKey===`forum:${id}`&&['claimed','checked_in'].includes(row.status));
 return{id,bookedCount:active.length,checkedInCount:active.filter(row=>row.status==='checked_in').length};
});
await page.setRequestInterception(true);
page.on('request',request=>{
 const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
 const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
 const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
 if(route==='/api/user/me')return signedIn?reply({id:account,name:account,phone:'13800000000'}):reply({message:'Sign in'},401);
 if(route==='/api/doai/me')return reply({isAdmin:admin});
 if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:account,bookmarks:[]});
 if(route==='/api/doai/forum-stats'){
  statsReads++;const snapshot=statistics();
  if(mode==='hold-first'){mode='ok';heldStats=()=>reply({ok:true,forums:snapshot});return;}
  if(mode==='fail')return reply({message:'Statistics unavailable'},503);
  if(mode==='malformed')return reply({ok:true});
  return reply({ok:true,forums:snapshot});
 }
 if(route==='/api/doai/tickets'&&request.method()==='GET')return reply({tickets:tickets.filter(row=>row.ownerUserId===account)});
 if(route==='/api/doai/tickets'){
  const input=JSON.parse(request.postData()),saved={...input,id:`pass-${tickets.length+1}`,ownerUserId:account,holderName:account,holderPhone:'13800000000',status:'claimed',qrCode:`QA-${tickets.length+1}`,issuedAt:'2026-11-01'};
  tickets.push(saved);return reply({ticket:saved});
 }
 if(route.startsWith('/api/doai/tickets/')&&request.method()==='DELETE'){
  if(cancelMode==='fail')return reply({message:'保留原预约的取消失败'},503);
  tickets=tickets.filter(row=>row.id!==route.split('/').at(-1));return reply({ok:true});
 }
 if(route==='/api/doai/checkin'){
  const input=JSON.parse(request.postData()),row=tickets.find(row=>row.qrCode===input.code);row.status='checked_in';
  return reply({ok:true,record:{code:row.qrCode,holder:row.holderName,gate:input.gate,time:'2026-11-01T00:00:00.000Z'}});
 }
 if(route==='/api/doai/checkins')return reply({ok:true,checkins:[]});
 for(const key of ['registrations','cards','notifications','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
 if(route==='/api/doai/site-config')return reply({config:null});return reply({ok:true});
});
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
const go=route=>page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});
const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`Missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
const wait=async fn=>{const until=Date.now()+5000;while(!fn()){if(Date.now()>until)throw new Error('Expected request missing');await new Promise(resolve=>setTimeout(resolve,10));}};
const firstCard=()=>page.evaluateHandle(()=>document.querySelector('a[href$="/detail/forum/forum-1"]').closest('article'));
try{
 await go('forum');await text('正在读取预约统计');await wait(()=>heldStats);
 const card=await firstCard();await page.waitForFunction(()=>!document.querySelector('a[href$="/detail/forum/forum-1"]').closest('article').querySelector('button').disabled);
 await card.asElement().evaluate(node=>node.querySelector('button').click());await card.dispose();await text('1 人已预约');
 await heldStats();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await text('1 人已预约');
 await go('detail/forum/forum-1');await text('1 人已预约');await click('已预约 · 点击取消');await text('保留原预约的取消失败');await text('1 人已预约');
 cancelMode='ok';await click('已预约 · 点击取消');await text('0 人已预约');
 console.log('PASS: old statistics cannot overwrite confirmed booking, failed cancellation retains count and successful cancellation refreshes actual zero');

 mode='fail';await click('刷新预约统计');await text('预约统计暂时无法加载');await click('免费预约');await text('已预约 · 点击取消');assert.equal(tickets.length,1);
 mode='ok';await click('重新加载预约统计');await text('1 人已预约');
 account='admin';admin=true;mode='malformed';await go('admin');await text('组委会管理中枢');await click('论坛场次管理');await text('预约人数暂不可用');
 assert.equal(await page.$$eval('section[aria-label="分论坛预约统计"] strong',nodes=>nodes.length),0);
 mode='ok';await click('重新加载预约统计');await page.waitForFunction(()=>document.querySelector('[data-forum-id="forum-1"]').textContent.includes('已预约：1'));
 const before=statsReads;await click('验票签到');await page.waitForSelector('#checkin-code');await page.type('#checkin-code',tickets[0].qrCode);await click('验票并签到');await text('签到成功，可以入场');await wait(()=>statsReads>before);
 await click('论坛场次管理');await page.waitForFunction(()=>document.querySelector('[data-forum-id="forum-1"]').textContent.includes('已核销：1'));
 console.log('PASS: unavailable statistics do not block reservations, malformed responses never show zero, and a successful gate scan updates checked-in totals');
 await page.evaluate(()=>{Date.now=()=>Date.parse('2026-12-07T00:00:00Z');dispatchEvent(new Event('focus'));});await text('已结束 · 不再接受预约');
 assert.equal((await page.$eval('section[aria-label="分论坛预约统计"]',node=>node.textContent)).includes('正常开放'),false);
 await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/tmp/doai-forum-statistics-mobile.png'});
 signedIn=false;admin=false;await go('forum');await text('1 人已预约');assert.deepEqual(errors,[]);
 console.log('PASS: ended schedules are labelled correctly, counts fit mobile and anonymous visitors can read aggregate statistics');
}finally{await browser.close();}
