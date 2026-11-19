import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
// All APIs are intercepted, including applications and administrator decisions.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(String(error)));
let account = 'owner', admin = false, mode = 'ok', posts = 0, reviews = 0, listFails = true, reviewMode = 'fail', heldIssue, heldReview, lastInput;
const tickets = [], notices = [];
const dto = row => ({ ...row, qrCode: ['claimed','checked_in'].includes(row.status) ? row.qrCode : '' });
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
    // Business regressions use local fallback fonts, independent of Google Fonts availability.
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort(); if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/')); const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return reply({ id: account, name: `QA ${account}`, phone: '13800000000' });
  if (route === '/api/doai/me') return reply({ isAdmin: admin, channelPolicy: 'scoped-v1' });
  if (route === '/api/doai/tickets' && request.method() === 'GET') return reply({ tickets: tickets.filter(row => row.ownerUserId === account).map(dto) });
  if (route === '/api/doai/tickets') {
    posts++; lastInput = JSON.parse(request.postData()); const input = lastInput, owner = account;
    if (mode === 'fail') return reply({ error: { message: '本地申请保存失败' } }, 503);
    const complete = () => {
      let saved = tickets.find(row => row.ownerUserId === owner && row.bookingKey === input.bookingKey);
      if (!saved) { saved = { ...input, id: `app-${tickets.length + 1}`, ownerUserId: owner, status: input.bookingKey.includes(':media:') ? 'pending_review' : 'claimed', qrCode: `SERVER-ENTRY-${tickets.length + 1}`, issuedAt: '2026-10-27' }; tickets.push(saved); }
      return reply({ ok: true, ticket: dto(saved) });
    };
    if (mode === 'hold') { heldIssue = complete; return; } return complete();
  }
  if (route === '/api/doai/attendance-applications') return listFails ? reply({ error: { message: 'Local unavailable' } }, 503) : reply({ ok: true, applications: tickets.filter(row => row.bookingKey.includes(':media:')).map(dto) });
  if (route === '/api/doai/attendance-review') {
    reviews++; const input = JSON.parse(request.postData());
    if (reviewMode === 'fail') return reply({ error: { message: '本地审核保存失败' } }, 503);
    const complete = () => {
      const row = tickets.find(row => row.id === input.id); Object.assign(row, { status: input.status, reviewFeedback: input.feedback });
      notices.push({ id: `notice-${reviews}`, toUserId: row.ownerUserId, type: 'forum', title: '媒体参会审核结果', content: input.status, read: false, time: '2026-10-27', link: 'dashboard/passport' });
      return reply({ ok: true, ticket: dto(row) });
    };
    if (reviewMode === 'hold') { heldReview = complete; return; } return complete();
  }
  if (route === '/api/doai/notifications') return reply({ notifications: notices.filter(row => row.toUserId === account) });
  for (const key of ['registrations','cards','recruitments','talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const wait = async fn => { const end = Date.now()+5000; while (!fn()) { if (Date.now()>end) throw new Error('Intercepted request missing'); await new Promise(resolve=>setTimeout(resolve,10)); } };
const click = async label => { const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label); assert.ok(handle.asElement(),`Missing ${label}`); await handle.asElement().evaluate(node=>node.click()); await handle.dispose(); };
const pass = label => page.evaluate(label => [...document.querySelectorAll('main button')].find(node=>node.querySelector('h3')?.textContent===label).click(),label);
const seat = label => page.evaluate(label => { const section=[...document.querySelectorAll('section')].find(node=>node.querySelector('h2')?.textContent==='场次选座'); [...section.querySelectorAll('button')].find(node=>node.textContent.includes(label)).click(); },label);
const fill = async (selector,value) => { await page.focus(selector); await page.$eval(selector,node=>node.select()); await page.keyboard.type(value); };
const go = async route => { await page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'}); if (route === 'attend') { await page.waitForSelector('#attendance-channel'); await page.select('#attendance-channel','public'); } };
try {
  await go('attend'); await page.waitForSelector('#att-name'); await seat('开幕主会场'); await pass('公众开放日');
  assert.equal(await page.$$eval('section', nodes=>nodes.some(node=>node.querySelector('h2')?.textContent==='场次选座')), false);
  await fill('#att-org','QA school'); await click('提交报名'); await text('报名成功');
  assert.equal(lastInput.bookingKey,'attendance:pass-day2'); assert.equal(lastInput.organization,'QA school'); assert.ok(!lastInput.title.includes('开幕'));
  await click('再报一个票种'); await pass('分论坛选座'); assert.equal(await page.$('#attend-form form'),null); await click('前往分论坛预约'); await page.waitForFunction(()=>location.pathname.endsWith('/forum'));
  console.log('PASS: switching to Open Day discards hidden seat picks, organization is submitted and Forums Only routes to real forum reservations');

  await go('attend'); await page.waitForSelector('#att-name'); await pass('媒体 / 行业观摩'); await seat('开幕主会场'); const before=posts;
  await click('提交报名'); await text('请填写机构或学校'); assert.equal(posts,before);
  await fill('#att-org','QA newsroom'); await fill('#att-phone','123'); await click('提交报名'); await text('正确的 11 位手机号'); assert.equal(posts,before);
  await fill('#att-phone','13800000000'); mode='fail'; await click('提交报名'); await text('本地申请保存失败'); assert.equal(await page.$eval('#att-org',node=>node.value),'QA newsroom');
  mode='hold'; await page.$eval('#attend-form form',form=>{form.requestSubmit();form.requestSubmit();}); await wait(()=>heldIssue); assert.equal(posts,before+2);
  await heldIssue(); mode='ok'; await text('申请已提交');
  assert.equal(lastInput.bookingKey,'attendance:media:seat-open'); assert.equal((await page.$eval('main',node=>node.textContent)).includes('SERVER-ENTRY'),false);
  await click('查看我的凭证'); await text('待审核');
  const pendingCard=await page.evaluateHandle(()=>[...document.querySelectorAll('[data-testid="digital-ticket"]')].find(node=>node.textContent.includes('QA newsroom')));
  assert.equal(await pendingCard.asElement().$('[data-testid="ticket-qr"]'),null); await pendingCard.dispose();
  console.log('PASS: media organization/mobile validation, failed draft retention, duplicate submit protection, pending success view and no early entry QR');

  await go('attend'); await page.waitForSelector('#att-name');
  assert.equal(await page.$$eval('dt', nodes => nodes.find(node => node.textContent === '已持有凭证').nextElementSibling.textContent), '1');
  account='admin';admin=true;await go('admin');await text('组委会管理中枢');await click('大会报名与审核');await text('参会申请暂时无法加载');
  listFails=false;await click('重新加载参会申请');await text('QA newsroom');await click('审核参会申请');
  await click('不通过');await text('请填写未通过的原因');await fill('#attendance-review-feedback','Accredited newsroom');await click('通过并签发凭证');await text('本地审核保存失败');
  assert.equal(await page.$eval('#attendance-review-feedback',node=>node.value),'Accredited newsroom');reviewMode='hold';
  await page.$eval('[role="dialog"]',form=>{form.requestSubmit();form.requestSubmit();});await wait(()=>heldReview);assert.equal(reviews,2);
  assert.equal(await page.$eval('#attendance-review-feedback',node=>node.disabled),true);await heldReview();reviewMode='ok';await text('已通过审核');
  account='owner';admin=false;await go('dashboard/passport');await text('SERVER-ENTRY-2');await text('Accredited newsroom');
  console.log('PASS: administrator load retry, required decline reason, failed-review draft and confirmed approval issue a persistent usable pass');

  await go('attend');await page.waitForSelector('#att-name');await pass('媒体 / 行业观摩');await seat('决赛路演厅');await fill('#att-org','Second newsroom');await click('提交报名');await text('申请已提交');
  account='admin';admin=true;await go('admin');await text('组委会管理中枢');await click('大会报名与审核');await text('Second newsroom');await click('审核参会申请');await fill('#attendance-review-feedback','请补充记者证');await click('不通过');await text('未通过审核');
  account='owner';admin=false;await go('dashboard/passport');await text('请补充记者证');
  const rejectedCard=await page.evaluateHandle(()=>[...document.querySelectorAll('[data-testid="digital-ticket"]')].find(node=>node.textContent.includes('Second newsroom')));
  assert.equal(await rejectedCard.asElement().$('[data-testid="ticket-qr"]'),null);await rejectedCard.dispose();
  await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.evaluate(()=>[...document.querySelectorAll('[data-testid="digital-ticket"]')].find(node=>node.textContent.includes('Second newsroom')).scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:'/tmp/doai-attendance-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS: rejection and explanation survive reload, rejected applications have no QR and mobile passes fit the viewport');
} finally {await browser.close();}
