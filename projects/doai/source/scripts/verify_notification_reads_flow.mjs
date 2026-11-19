import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(), errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'a', mode = 'hold', release;
const writes = [], rows = [];
const add = (id, owner) => rows.push({ id, type: 'system', title: `Message ${id}`, content: 'Local read confirmation', toUserId: owner, time: '2026-10-27', read: false });
add('first', 'a'); add('second', 'a'); add('b-only', 'b');
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/user/me') return reply({ id: account, name: `Account ${account}`, city: '上海' });
  if (route === '/api/doai/me') return reply({ isAdmin: false });
  if (route === '/api/doai/notifications') return reply({ notifications: rows.filter(row => row.toUserId === account) });
  if (route === '/api/doai/notifications/read-ids') {
    const owner = account, input = JSON.parse(request.postData());
    writes.push({ owner, ids: input.ids, path: route });
    assert.equal(input.expectedUserId, owner); assert.equal(request.headers()['x-doai-actor'], owner);
    if (mode === 'malformed') return reply({ ok: true });
    if (mode === 'old') return reply({ message: 'Cannot POST' }, 404);
    const complete = () => {
      for (const row of rows) if (row.toUserId === owner && input.ids.includes(row.id)) row.read = true;
      return reply({ ok: true, userId: owner, readIds: input.ids });
    };
    if (mode === 'hold') { release = complete; return; }
    return complete();
  }
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  for (const key of ['registrations', 'tickets', 'cards', 'recruitments', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = label => page.evaluate(label => {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label);
  if (!button || button.disabled) throw new Error(`Missing available button ${label}`);
  button.click();
}, label);
const waitRelease = async () => { const end = Date.now() + 5000; while (!release) { if (Date.now() > end) throw new Error('Missing read request'); await new Promise(resolve => setTimeout(resolve, 10)); } };
const drawerText = () => page.$eval('[aria-labelledby="notification-title"]', node => node.textContent);
try {
  await page.goto(`${site}/dashboard/messages`, { waitUntil: 'networkidle0' }); await text('2 条未读');
  await page.evaluate(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes('当前消息全部已读')); button.click(); button.click(); });
  await waitRelease(); assert.equal(writes.length, 1); assert.deepEqual(new Set(writes[0].ids), new Set(['first', 'second']));
  add('new-arrival', 'a');
  await page.click('[aria-label="关闭通知"]'); await page.click('[aria-label="通知"]'); await text('3 条未读');
  await release(); release = null; await text('1 条未读');
  assert.equal(rows.find(row => row.id === 'new-arrival').read, false);
  await click('刷新'); await text('1 条未读');
  console.log('PASS: repeated batch click posts once, a newly loaded arrival stays unread when an older receipt completes and refresh preserves the exact saved set');

  mode = 'malformed'; await click('当前消息全部已读'); await text('已读状态未保存');
  assert.ok((await drawerText()).includes('1 条未读'));
  mode = 'old'; await click('当前消息全部已读'); await text('消息不存在或服务暂不可用');
  assert.ok((await drawerText()).includes('1 条未读')); assert.ok(writes.every(write => write.path.endsWith('/read-ids')));
  mode = 'ok'; await click('当前消息全部已读'); await text('0 条未读');
  await click('刷新'); await text('0 条未读');
  console.log('PASS: malformed HTTP 200 and old-backend 404 do not mark messages locally or fall back to a broad mutation; confirmed retry persists');

  add('pending-a', 'a'); await click('刷新'); await text('1 条未读');
  mode = 'hold'; await click('当前消息全部已读'); await waitRelease();
  account = 'b'; await page.evaluate(() => dispatchEvent(new Event('focus')));
  await page.waitForSelector('img[alt="Account b"]');
  if (!await page.$('[aria-labelledby="notification-title"]')) await page.click('[aria-label="通知"]');
  await text('Message b-only'); await release(); release = null;
  await text('1 条未读'); assert.equal(rows.find(row => row.id === 'b-only').read, false);
  assert.equal((await drawerText()).includes('Message pending-a'), false);
  mode = 'ok'; await click('当前消息全部已读'); await text('0 条未读');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  assert.deepEqual(errors, []);
  console.log('PASS: a late read receipt from A cannot change or lock B, and the scoped read action fits the mobile drawer');
} finally { await browser.close(); }
