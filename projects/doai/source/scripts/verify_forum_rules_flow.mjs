import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
// All requests are mocked; the browser runs in a non-Shanghai timezone.
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(); await page.emulateTimezone('America/Los_Angeles');
const cutoff = Date.parse('2026-12-04T10:00:00+08:00');
await page.evaluateOnNewDocument(clock => { window.__forumClock = clock; Date.now = () => window.__forumClock; }, cutoff - 100);
let rows = [1,2].map(index => ({ id: `pass-${index}`, bookingKey: `forum:forum-${index}`, ownerUserId: 'holder', type: 'forum', status: index === 2 ? 'checked_in' : 'claimed', qrCode: `QA-${index}`, holderName: 'Holder', holderPhone: '13800000000', title: `Forum ${index}`, issuedAt: '2026-10-27' }));
let cancels = 0, books = 0, cancelMode = 'fail', heldCancel;
const errors = []; page.on('pageerror', error => errors.push(String(error)));
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url()); if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/')); const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body,status=200) => request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: 'holder', bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return reply({id:'holder',name:'Holder',phone:'13800000000'});
  if (route === '/api/doai/me') return reply({isAdmin:false});
  if (route === '/api/doai/tickets') {if(request.method()==='POST'){books++;return reply({message:'Unexpected booking'},500);}return reply({tickets:rows});}
  if (route.startsWith('/api/doai/tickets/') && request.method()==='DELETE') {
    cancels++;if(cancelMode==='fail')return reply({message:'服务端拒绝取消，请保留原预约'},409);
    heldCancel=()=>{rows=rows.filter(row=>row.id!==route.split('/').at(-1));return reply({ok:true});};return;
  }
  for(const key of ['registrations','cards','notifications','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
  if(route==='/api/doai/site-config')return reply({config:null});return reply({ok:true});
});
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
let currentClock = cutoff - 100;
const setClock=async(clock,focus=true)=>{currentClock=clock;await page.evaluate(({clock,focus})=>{window.__forumClock=clock;if(focus)dispatchEvent(new Event('focus'));},{clock,focus});};
const go=async route=>{await page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});await setClock(currentClock);};
const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`Missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
try{
  await go('detail/forum/forum-1');await text('已预约 · 点击取消');
  const deadline=await page.$$eval('dt',nodes=>nodes.find(node=>node.textContent==='取消截止（上海时间）').nextElementSibling.textContent);assert.ok(deadline.includes('10:00'),deadline);
  currentClock = cutoff;
  await page.evaluate(clock=>{window.__forumClock=clock;[...document.querySelectorAll('button')].find(node=>node.textContent.includes('已预约 · 点击取消')).click();},cutoff);
  await text('已进入开场前 48 小时');await text('已预约 · 已过取消时间');assert.equal(cancels,0);
  assert.equal(await page.$$eval('main button',nodes=>nodes.filter(node=>node.textContent.includes('已过取消时间')).every(node=>node.disabled)),true);
  await go('forum');await text('已过取消时间');await text('已核销 · 不可取消');
  const expiredCard=await page.$('a[href$="/detail/forum/forum-1"]');
  assert.equal(await expiredCard.evaluate(node=>[...node.closest('article').querySelectorAll('button')].some(node=>node.textContent.trim()==='取消')),false);
  console.log('PASS: Shanghai deadline is correct in Los Angeles, stale UI cannot cancel at cutoff, idle timer updates labels and list hides checked-in/late cancellation');

  await setClock(cutoff-100);await go('detail/forum/forum-1');await page.evaluate(clock=>{window.__forumClock=clock;dispatchEvent(new Event('focus'));},cutoff-100);await text('已预约 · 点击取消');
  await click('已预约 · 点击取消');await text('服务端拒绝取消');assert.equal(rows.length,2);
  cancelMode='hold';await page.$$eval('main button',nodes=>nodes.filter(node=>node.textContent.includes('已预约 · 点击取消')).forEach(node=>{node.click();node.click();}));
  await page.waitForFunction(()=>document.body.textContent.includes('正在处理…'));assert.equal(cancels,2);await heldCancel();await text('免费预约');
  await go('detail/forum/forum-2');await text('已核销 · 不可取消');assert.equal(await page.$$eval('main button',nodes=>nodes.filter(node=>node.textContent.includes('已核销 · 不可取消')).every(node=>node.disabled)),true);
  await setClock(Date.parse('2026-12-06T12:00:00+08:00'));await go('detail/forum/forum-1');await text('已结束');await click('已结束');assert.equal(books,0);
  const closeError = await page.$('[role="alert"] button'); if (closeError) await closeError.click();
  await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'/tmp/doai-forum-cutoff-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS: server cancellation failures retain reservations, duplicate requests are blocked, checked-in passes cannot cancel and ended sessions cannot book');
}finally{await browser.close();}
