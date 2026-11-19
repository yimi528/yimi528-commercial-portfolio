import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// All authentication, SMS, ticket and notification requests are intercepted locally.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
// Exercise the pre-event booking flow independently of the day this test runs.
await page.evaluateOnNewDocument(() => { Date.now = () => Date.parse('2026-11-01T00:00:00Z'); });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'b', signedIn = true;
let initialAuth = false, authReads = 0, heldAuth;
let holdLogin = false, heldLogin, loginPosts = 0;
let holdSms = false, heldSms, smsPosts = 0;
let holdTickets = false, heldTickets;
let holdBooking = false, heldBooking, bookPosts = 0;
let holdCancel = false, heldCancel, cancelPosts = 0, cancelFails = false;
let ticketFails = false;
let guestPosts = 0, failGuestAt = 0, holdGuest = false, heldGuest;
let holdRead = false, heldRead, readPosts = 0, readFails = false, refreshFails = false;
const ticketRows = { a: [], b: [] };
const notices = [{ id: 'notice-1', type: 'system', title: '保存状态测试', content: '测试已读持久化', time: '2026-10-26', toUserId: 'all', read: false }];
const waitFor = async predicate => {
  const end = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Expected intercepted request did not arrive');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
const ticket = (id, owner) => ({ id: `${owner}-${id}`, bookingKey: `forum:${id}`, type: 'forum', ownerUserId: owner, title: '论坛预约凭证', titleEn: 'Forum pass', holderName: `账号${owner}`, holderPhone: '13800000000', qrCode: `QA-${id}`, status: 'claimed', issuedAt: '2026-10-26' });
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const api = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${api}/${url.searchParams.get('__p')}` : api;
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') {
    if (initialAuth && authReads++ === 0) { heldAuth = respond; return; }
    return signedIn ? respond({ id: account, name: `新账号${account.toUpperCase()}`, phone: '13800000000', city: '上海' }) : respond({ message: '请先登录' }, 401);
  }
  if (route === '/api/doai/me') return respond({ isAdmin: false });
  if (route === '/api/auth/send-code') {
    smsPosts++;
    if (holdSms) { heldSms = () => respond({ ok: true }); return; }
    return respond({ ok: true });
  }
  if (route === '/api/auth/login') {
    loginPosts++;
    const complete = () => { signedIn = true; return respond({ token: `qa-token-${account}` }); };
    if (holdLogin) { heldLogin = complete; return; }
    return complete();
  }
  if (route === '/api/auth/logout') { signedIn = false; return respond({ ok: true }); }
  if (route === '/api/doai/tickets' && request.method() === 'GET') {
    const rows = [...ticketRows[account]];
    if (holdTickets) { heldTickets = () => respond({ tickets: rows }); return; }
    return ticketFails ? respond({ message: '票据加载失败' }, 503) : respond({ tickets: rows });
  }
  if (route === '/api/doai/tickets' && request.method() === 'POST') {
    const input = JSON.parse(request.postData());
    const owner = account;
    const { bookingKey } = input;
    if (input.type === 'guest') {
      guestPosts++;
      if (guestPosts === failGuestAt) return respond({ message: '本地模拟第二场出票失败' }, 503);
      const created = { ...ticket(bookingKey, owner), ...input, id: `${owner}-${bookingKey}`, qrCode: `QA-${bookingKey}`, ownerUserId: owner };
      const complete = () => {
        ticketRows[owner] = [created, ...ticketRows[owner].filter(row => row.bookingKey !== bookingKey)];
        return respond({ ticket: created });
      };
      if (holdGuest) { heldGuest = complete; return; }
      return complete();
    }
    bookPosts++;
    const created = ticket(bookingKey.slice('forum:'.length), owner);
    const complete = () => { ticketRows[owner].push(created); return respond({ ticket: created }); };
    if (holdBooking) { heldBooking = complete; return; }
    return complete();
  }
  if (route.startsWith('/api/doai/tickets/') && request.method() === 'DELETE') {
    cancelPosts++;
    if (cancelFails) return respond({ message: '本地模拟取消失败' }, 409);
    const owner = account, id = route.split('/').at(-1);
    const complete = () => { ticketRows[owner] = ticketRows[owner].filter(row => row.id !== id); return respond({ ok: true }); };
    if (holdCancel) { heldCancel = complete; return; }
    return complete();
  }
  if (route === '/api/doai/notifications') return refreshFails ? respond({ message: '刷新失败' }, 503) : respond({ ok: true, notifications: notices });
  if (route === '/api/doai/notifications/read' || route === '/api/doai/notifications/read-all' || route === '/api/doai/notifications/read-ids') {
    readPosts++;
    const complete = () => {
      if (readFails) return respond({ message: '已读保存失败' }, 503);
      const input = JSON.parse(request.postData() || '{}');
      const ids = input.ids || (input.id ? [input.id] : notices.map(notice => notice.id));
      notices.forEach(notice => { if (ids.includes(notice.id)) notice.read = true; });
      return respond({ ok: true, userId: account, readIds: ids });
    };
    if (holdRead) { heldRead = complete; return; }
    return complete();
  }
  if (route === '/api/doai/registrations') return respond({ registrations: [] });
  if (route === '/api/doai/recruitments') return respond({ recruitments: [] });
  if (route === '/api/doai/talents') return respond({ talents: [] });
  if (route === '/api/doai/cards') return respond({ ok: true, cards: [] });
  if (route === '/api/doai/site-config') return respond({ config: null });
  return respond({ ok: true });
});
const go = route => page.goto(`${site}/${route}`, { waitUntil: 'domcontentloaded' });
const click = async label => {
  const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label), label);
  assert.ok(handle.asElement(), `Missing button: ${label}`);
  await handle.asElement().click();
  await handle.dispose();
};
const waitText = text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text);
const waitAccount = id => page.waitForSelector(`img[alt="新账号${id.toUpperCase()}"]`);
const loginFields = async () => {
  await page.type('#atomclub-phone', '13800000000');
  await page.type('#atomclub-code', '123456');
  await page.click('[role="dialog"] input[type="checkbox"]');
};
const closeError = async () => {
  const buttons = await page.$$('[role="alert"] button');
  for (const button of buttons) await button.click();
};
const routeInApp = async route => page.evaluate(path => {
  history.pushState({}, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}, `${new URL(site).pathname.replace(/\/$/, '')}/${route}`);
try {
  for (const status of [401, 200]) {
    initialAuth = true; authReads = 0; heldAuth = undefined;
    holdLogin = true; heldLogin = undefined;
    await go('register/industry');
    await page.waitForSelector('input[placeholder="请输入姓名"]');
    await waitFor(() => heldAuth);
    await page.type('input[placeholder="请输入姓名"]', '报名测试');
    await page.type('input[placeholder*="深圳"]', '上海');
    await click('下一步：参赛模式');
    await page.waitForSelector('#atomclub-phone');
    await loginFields();
    if (status === 401) {
      holdSms = true;
      await page.$$eval('[role="dialog"] button', buttons => buttons.filter(button => button.textContent.trim() === '获取验证码').forEach(button => { button.click(); button.click(); }));
      await waitFor(() => heldSms);
      assert.equal(smsPosts, 1);
      assert.equal(await page.$eval('#atomclub-phone', input => input.disabled), true);
      await heldSms(); holdSms = false;
      await page.waitForFunction(() => !document.querySelector('#atomclub-phone').disabled);
    }
    const before = loginPosts;
    await page.$eval('[role="dialog"] form', form => { form.requestSubmit(); form.requestSubmit(); });
    await waitFor(() => heldLogin);
    assert.equal(loginPosts, before + 1);
    assert.equal(await page.$eval('#atomclub-phone', input => input.disabled), true);
    assert.equal(await page.$eval('button[aria-label="关闭登录窗口"]', button => button.disabled), true);
    await heldLogin();
    await waitAccount('b');
    await heldAuth(status === 200 ? { id: 'old-account', name: '旧账号', phone: '13900000000' } : { message: '旧会话失效' }, status);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await page.$('img[alt="新账号B"]'));
  }
  initialAuth = false; holdLogin = false;
  console.log('PASS: duplicate SMS/login protection, locked credentials, late initial auth success/failure cannot replace new login');

  ticketRows.b = [ticket('forum-1', 'b')];
  ticketRows.a.push(ticket('forum-3', 'a'));
  holdTickets = true; heldTickets = undefined;
  await go('detail/forum/forum-1');
  await waitFor(() => heldTickets);
  await waitText('正在读取预约凭证');
  assert.equal(await page.$$eval('main button', buttons => buttons.filter(button => button.textContent.includes('正在处理')).every(button => button.disabled)), true);
  await heldTickets(); holdTickets = false;
  await waitText('已预约 · 点击取消');
  cancelFails = true;
  await click('已预约 · 点击取消');
  await waitText('本地模拟取消失败');
  await closeError();
  assert.equal(await page.$$eval('main button', buttons => buttons.filter(button => button.textContent.includes('已预约 · 点击取消')).length), 2);
  cancelFails = false; holdCancel = true; heldCancel = undefined;
  await page.$$eval('main button', buttons => buttons.filter(button => button.textContent.includes('已预约 · 点击取消')).forEach(button => button.click()));
  await waitFor(() => heldCancel);
  assert.equal(cancelPosts, 2);
  await heldCancel(); holdCancel = false;
  await waitText('免费预约');
  holdBooking = true; heldBooking = undefined;
  await page.$$eval('main button', buttons => buttons.filter(button => button.textContent.trim() === '免费预约').forEach(button => button.click()));
  await waitFor(() => heldBooking);
  assert.equal(bookPosts, 1);
  await heldBooking(); holdBooking = false;
  await waitText('已预约 · 点击取消');
  await go('detail/forum/forum-1');
  await waitText('已预约 · 点击取消');
  assert.equal(bookPosts, 1);
  ticketFails = true;
  await go('forum');
  await waitText('预约凭证暂时无法加载');
  ticketFails = false;
  await click('重新加载凭证');
  await waitText('已预约');
  console.log('PASS: ticket-load gating/retry, failed cancellation keeps reservation, shared pending lock and reload persistence');

  holdBooking = true; heldBooking = undefined;
  await routeInApp('detail/forum/forum-2');
  await waitText('免费预约');
  await click('免费预约');
  await waitFor(() => heldBooking);
  await page.click('button[aria-label="账户菜单"]');
  await click('退出登录');
  await page.waitForSelector('button[aria-label="账户菜单"]', { hidden: true });
  account = 'a';
  await click('登录'); await loginFields(); await click('登录 / 注册');
  await waitAccount('a');
  await heldBooking(); holdBooking = false;
  await routeInApp('detail/forum/forum-2');
  await waitText('免费预约');
  assert.equal(await page.$$eval('main button', buttons => buttons.filter(button => button.textContent.includes('已预约 · 点击取消')).length), 0);
  console.log('PASS: late booking from the old account cannot mark the new account as reserved');

  holdTickets = true; heldTickets = undefined;
  await go('attend');
  await waitFor(() => heldTickets);
  await page.$$eval('section', sections => {
    const seats = sections.find(section => section.querySelector('h2')?.textContent === '场次选座');
    const buttons = seats.querySelectorAll('button');
    buttons[0].click(); buttons[1].click();
  });
  await page.type('#att-name', '参会测试A');
  await page.type('#att-phone', '13800000000');
  holdGuest = true; failGuestAt = 2;
  await page.$eval('#attend-form form', form => { form.requestSubmit(); form.requestSubmit(); });
  await waitFor(() => heldGuest);
  assert.equal(guestPosts, 1);
  assert.equal(await page.$eval('#att-name', input => input.disabled), true);
  holdGuest = false;
  await heldGuest();
  await waitText('本地模拟第二场出票失败');
  await heldTickets(); holdTickets = false;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.$$eval('dt', nodes => nodes.find(node => node.textContent === '已持有凭证').nextElementSibling.textContent), '1');
  assert.equal(await page.$eval('#att-name', input => input.value), '参会测试A');
  failGuestAt = 0;
  await click('提交报名');
  await page.waitForFunction(() => document.querySelector('main h1')?.textContent === '报名成功');
  assert.equal(ticketRows.a.filter(row => row.type === 'guest').length, 2);
  assert.ok((await page.$eval('main', node => node.textContent)).includes('QA-attendance:seat-open'));
  assert.ok((await page.$eval('main', node => node.textContent)).includes('QA-attendance:seat-roadshow'));
  await click('查看我的凭证');
  await waitText('QA-forum-3');
  await waitText('QA-attendance:seat-roadshow');
  console.log('PASS: partial attendance failure keeps issued passes, stale ticket load cannot erase them, retry is idempotent and success shows its own passes');

  await page.click('button[aria-label="通知"]');
  await waitText('1 条未读');
  assert.ok((await page.$eval('[aria-labelledby="notification-title"]', node => node.textContent)).includes('共 1 条消息'));
  holdRead = true; readFails = true;
  await click('标为已读');
  await waitFor(() => heldRead);
  assert.equal(readPosts, 1);
  assert.ok((await page.$eval('[aria-labelledby="notification-title"]', node => node.textContent)).includes('1 条未读'));
  await heldRead(); holdRead = false;
  await waitText('已读状态未保存');
  assert.ok((await page.$eval('[aria-labelledby="notification-title"]', node => node.textContent)).includes('1 条未读'));
  await closeError(); readFails = false;
  await click('标为已读');
  await waitText('0 条未读');
  notices[0].read = false;
  notices.push({ ...notices[0], id: 'notice-2', title: '第二条未读消息' });
  await click('刷新'); await waitText('2 条未读');
  readFails = true;
  await click('当前消息全部已读'); await waitText('已读状态未保存');
  assert.ok((await page.$eval('[aria-labelledby="notification-title"]', node => node.textContent)).includes('2 条未读'));
  await closeError(); readFails = false;
  await click('当前消息全部已读'); await waitText('0 条未读');
  await click('刷新');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === '刷新' && !button.disabled));
  await waitText('0 条未读');
  refreshFails = true;
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === '刷新' && !button.disabled));
  await click('刷新'); await waitText('消息刷新失败');
  assert.deepEqual(errors, []);
  console.log('PASS: read state changes after confirmed persistence, failure keeps unread and refresh errors are visible');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-booking-session-failure.png', fullPage: true });
  console.error(await page.$eval('body', node => node.textContent));
  throw error;
} finally { await browser.close(); }
