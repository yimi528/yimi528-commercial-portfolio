import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(), errors = [];
page.on('pageerror', error => errors.push(String(error)));
await page.emulateTimezone('America/Los_Angeles');
await page.setViewport({ width: 390, height: 844 });
let cardsMode = 'invalid', exchangeMode = 'wrong-peer', posts = 0, release;
const peerName = 'P'.repeat(64);
const peer = { id: 'peer', name: peerName, avatar: '/expired-peer.png', roleTitle: 'Builder', city: 'C'.repeat(64), bio: {}, skills: [' React ', {}, null, 'React', 'S'.repeat(100)], phone: '13800000000' };
const cards = [{ id: 'pair-old', direction: 'in', exchangedAt: '2026-10-26T23:30:00Z', card: { id: 'historical', name: 'Historical Peer', phone: '交换后可见', org: {}, city: {}, skills: ['React', {}] } }];
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.endsWith('broken-avatar.png') || url.pathname.endsWith('expired-peer.png')) return request.respond({ status: 404, contentType: 'text/plain', body: 'Expired local mock image' });
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/user/me') return reply({ id: 'self', name: '本人', avatarUrl: '/broken-avatar.png', maskedPhone: '139****0000', city: '上海' });
  if (route === '/api/doai/me') return reply({ isAdmin: false });
  if (route === '/api/doai/users') return reply({ users: [peer, { id: 'missing-fields', name: {}, city: {}, skills: 'not-a-list', avatar: {} }] });
  if (route === '/api/doai/follows') return reply({ following: [], mutual: [] });
  if (route === '/api/doai/cards' && request.method() === 'GET') return reply({ cards: cardsMode === 'invalid' ? [{ ...cards[0], direction: 'unknown' }] : cards });
  if (route === '/api/doai/cards' && request.method() === 'POST') {
    posts++; const input = JSON.parse(request.postData()); assert.ok(['peer', 'missing-fields'].includes(input.toUserId));
    if (exchangeMode === 'wrong-peer') return reply({ ok: true, exchange: { id: 'wrong-pair', fromUserId: 'self', toUserId: 'another', from: { id: 'self' }, to: { id: 'another', name: 'Wrong receipt' }, direction: 'out', at: '2026-10-26T23:40:00Z' } });
    const to = input.toUserId === 'peer' ? { ...peer } : { id: 'missing-fields', name: '', skills: [] }; // Legacy payload may contain a phone; display exchange never exposes it.
    const pairId = input.toUserId === 'peer' ? 'pair-new' : 'pair-missing';
    const complete = () => {
      cards.push({ id: pairId, direction: 'out', exchangedAt: '2026-10-26T23:40:00Z', card: to });
      return reply({ ok: true, exchange: { id: pairId, fromUserId: 'self', toUserId: input.toUserId, from: { id: 'self' }, to, direction: 'out', at: '2026-10-26T23:40:00Z' } });
    };
    release = complete; return;
  }
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: 'self', bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/doai/site-config') return reply({ config: null });
  for (const key of ['registrations', 'tickets', 'notifications', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const route = value => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname.replace(/\/$/, '')}/${value}`);
const click = label => page.evaluate(label => {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label);
  if (!button || button.disabled) throw new Error(`Button unavailable: ${label}`);
  button.click();
}, label);
const exchange = (index = 0) => page.evaluate(index => {
  const button = [...document.querySelectorAll('button')].filter(button => button.textContent.trim() === '交换名片')[index];
  if (!button || button.disabled) throw new Error('Exchange button unavailable'); button.click(); button.click();
}, index);
try {
  await page.goto(`${site}/dashboard/passport`, { waitUntil: 'networkidle0' }); await text('名片盒暂时无法加载');
  cardsMode = 'ok'; await click('重新加载名片盒'); await text('Historical Peer'); await text('本次交换不含联系方式'); await text('2026-10-27');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('交换后可见'), false);
  await page.waitForFunction(() => !!document.querySelector('main [role="img"][aria-label="本人"]'));
  await route('square');
  await text(peerName); await text('未留存姓名');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('[object Object]'), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  console.log('PASS: invalid saved-card envelope has retry, malformed directory fields render safely, expired avatars fall back and the Shanghai date is correct in a Los Angeles browser');

  await exchange(); await text('名片交换对象未确认');
  assert.equal(posts, 1); assert.equal(cards.length, 1); assert.equal((await page.$eval('main', node => node.textContent)).includes('名片交换成功'), false);
  exchangeMode = 'hold'; await exchange();
  const end = Date.now() + 5000; while (!release) { if (Date.now() > end) throw new Error('Missing held exchange'); await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(posts, 2); await release(); await text('名片交换成功');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('13800000000'), false);
  const toast = await page.evaluate(() => {
    const title = [...document.querySelectorAll('div')].find(node => node.children.length === 0 && node.textContent.includes('名片交换成功'));
    const box = title?.closest('.fixed')?.getBoundingClientRect(); return box && { left: box.left, right: box.right, width: innerWidth };
  });
  assert.ok(toast && toast.left >= 0 && toast.right <= toast.width);
  await route('dashboard/passport'); await text('已互换的名片盒 (2)');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.reload({ waitUntil: 'networkidle0' }); await text('已互换的名片盒 (2)'); await text('本次交换不含联系方式');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('13800000000'), false);
  await route('square'); await text('未留存姓名'); release = null; await exchange(1);
  const emptyEnd = Date.now() + 5000; while (!release) { if (Date.now() > emptyEnd) throw new Error('Missing nameless exchange'); await new Promise(resolve => setTimeout(resolve, 10)); }
  await release(); await text('已与 该创客 互换名片'); await text('名片交换成功');
  assert.equal(posts, 3);
  assert.deepEqual(errors, []);
  console.log('PASS: wrong-peer receipt cannot enter the card box, repeated clicks post once, no account phone is displayed and the long-name success notice fits mobile and survives reload');
} finally { await browser.close(); }
