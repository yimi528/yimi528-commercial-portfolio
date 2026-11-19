import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
// Every API call is mocked: no real grant, revocation, login or profile write.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', error => errors.push(String(error)));
let account = 'self', expired = false, admin = true, listFails = true, mode = 'malformed', grants = 0, syncs = 0, heldGrant, heldSync;
let profile = { userId: 'self', name: '旧的展示姓名', city: '旧城市', bio: '旧简介', skills: ['Old'], isPublic: false, allowCardExchange: false };
const admins = [{ userId: 'root', name: '初始账号', enabled: true, source: 'bootstrap' }, { userId: 'self', name: '当前账号', enabled: true, source: 'database' }];
const wait = async fn => { const until = Date.now() + 5000; while (!fn()) { if (Date.now() > until) throw new Error('Mock request timed out'); await new Promise(resolve => setTimeout(resolve, 10)); } };
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort();
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (expired && ['/api/doai/me', '/api/doai/forum-bookmarks', '/api/doai/registrations', '/api/doai/cards', '/api/doai/tickets', '/api/doai/notifications', '/api/doai/admins'].includes(route)) return reply({ error: { code: 'DOAI_SESSION_EXPIRED', message: 'Expired' } }, 401);
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return expired ? reply({ message: 'Expired' }, 401) : reply({ id: account, name: '原子公社新姓名', avatarUrl: '', city: '上海', signature: '新简介', skills: ['React'] });
  if (route === '/api/doai/me') return reply({ isAdmin: admin, channelPolicy: 'scoped-v1', profile: { ...profile, userId: account } });
  if (route === '/api/doai/profile-sync') {
    syncs++; const body = JSON.parse(request.postData());
    heldSync = () => { profile = { ...profile, ...body, userId: body.expectedUserId }; return reply({ ok: true, isAdmin: admin, profile }); }; return;
  }
  if (route === '/api/doai/admins' && request.method() === 'GET') return listFails ? reply({ message: 'Unavailable' }, 503) : reply({ admins });
  if (route === '/api/doai/admins') {
    grants++; const body = JSON.parse(request.postData());
    if (mode === 'malformed') return reply({ ok: true });
    if (mode === 'forbidden') { admin = false; return reply({ message: '需要 DOAI 管理权限' }, 403); }
    heldGrant = () => { const saved = { role: body.role, channel: body.channel, userId: body.userId, name: '新增账号', enabled: true, source: 'database' }; admins.push(saved); return reply({ ok: true, admin: saved }); }; return;
  }
  if (route.startsWith('/api/doai/admins/') && request.method() === 'DELETE') { admins.find(row => row.userId === route.split('/').at(-1)).enabled = false; return reply({ ok: true }); }
  for (const key of ['registrations', 'tickets', 'notifications', 'cards', 'recruitments', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null, updatedAt: null });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = async label => {
  const button = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label), label);
  assert.ok(button.asElement(), `Missing ${label}`); await button.asElement().evaluate(node => node.click()); await button.dispose();
};
const route = path => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname}/${path}`);
const replace = async value => { await page.$eval('#admin-identity', (input, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }, value); };
try {
  await page.goto(`${site}/admin`, { waitUntil: 'domcontentloaded' }); await text('组委会管理中枢'); await click('管理员管理');
  await text('管理员名单暂时无法加载'); assert.equal(await page.$eval('#admin-identity', node => node.matches(':disabled')), true);
  listFails = false; await click('重新加载管理员'); await text('初始账号');
  assert.equal(await page.$$eval('section[aria-label="管理员名单"] button', nodes => nodes.filter(node => node.textContent === '停用权限').length), 0);
  await page.select('#admin-identity-kind', 'userId'); await page.select('#admin-access-role', 'super_admin'); await replace('new-account'); await click('保存管理权限'); await text('授权结果未确认');
  assert.equal(await page.$eval('#admin-identity', node => node.value), 'new-account');
  mode = 'hold'; await page.$eval('form[aria-label="添加管理员"]', form => { form.requestSubmit(); form.requestSubmit(); }); await wait(() => heldGrant); assert.equal(grants, 2);
  assert.equal(await page.$eval('#admin-identity', node => node.matches(':disabled')), true);
  await heldGrant(); await text('已保存 新增账号');
  page.once('dialog', dialog => dialog.accept()); await click('停用权限'); await text('管理员权限已停用');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/doai-admin-accounts-mobile.png' });
  console.log('PASS: admin list retry, no self/bootstrap removal, malformed response draft, duplicate guard, real confirmed grant and revocation');
  await route('dashboard/settings'); await text('同步原子公社资料'); await text('旧的展示姓名');
  await page.evaluate(() => { const node = [...document.querySelectorAll('button')].find(node => node.textContent.includes('同步原子公社资料')); node.click(); node.click(); });
  await wait(() => heldSync); assert.equal(syncs, 1); await heldSync(); await text('已同步原子公社资料'); await text('原子公社新姓名');
  assert.equal(profile.isPublic, false); assert.equal(profile.allowCardExchange, false); assert.deepEqual(profile.skills, ['React']);
  await page.reload({ waitUntil: 'domcontentloaded' }); await text('新简介');
  account = 'other'; await click('同步原子公社资料'); await text('登录状态已变化'); await text('同步原子公社资料'); assert.equal(syncs, 1);
  account = 'self'; expired = true; await click('重新读取账号'); await text('登录已过期');
  expired = false; await page.goto(`${site}/admin`, { waitUntil: 'domcontentloaded' }); await text('组委会管理中枢'); await click('管理员管理'); await text('初始账号');
  await page.select('#admin-identity-kind', 'userId'); await page.select('#admin-access-role', 'super_admin'); await replace('revoked-request'); mode = 'forbidden'; await click('保存管理权限');
  await text('此页面需要 DOAI 管理员权限');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: persisted authority profile sync, privacy retention, reload, account mismatch prevention and explicit expiry recovery');
} finally { await browser.close(); }
