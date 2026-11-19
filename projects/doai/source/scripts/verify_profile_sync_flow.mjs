import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(), errors = [];
page.on('pageerror', error => errors.push(String(error)));
// All identity, profile and business endpoints are local mocks. No real account is modified.
const completeMain = { id: 'self', name: 'Fresh main name', avatarUrl: '', city: '上海', province: '', signature: 'Fresh main bio', skills: [' React ', ' ', 'TypeScript'] };
let main = { ...completeMain }, profile = { userId: 'self', name: 'Saved old name', avatar: '', city: 'Old city', bio: 'Saved old bio', skills: ['Old skill'], isPublic: false, allowCardExchange: false };
let mode = 'stale', posts = 0, held;
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/user/me') return reply(main);
  if (route === '/api/doai/me') return reply({ isAdmin: false, profile });
  if (route === '/api/doai/profile-sync') {
    posts++; const input = JSON.parse(request.postData());
    assert.equal(input.expectedUserId, 'self'); assert.equal(request.headers()['x-doai-actor'], 'self');
    if (mode === 'stale') return reply({ ok: true, isAdmin: false, profile });
    profile = { ...profile, name: input.name, avatar: input.avatar, city: input.city, bio: input.bio, skills: input.skills };
    if (mode === 'lost') return reply({ message: 'Mock response lost after save' }, 503);
    const complete = () => reply({ ok: true, isAdmin: false, profile });
    if (mode === 'hold') { held = complete; return; }
    return complete();
  }
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: 'self', bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  for (const key of ['registrations', 'tickets', 'notifications', 'cards', 'recruitments', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = label => page.evaluate(label => {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label);
  if (!button || button.disabled) throw new Error(`Button unavailable: ${label}`);
  button.click();
}, label);
const sync = () => click('同步原子公社资料');
const notice = () => page.$eval('[role="status"]', node => node.textContent);
const settingsText = () => page.$eval('main', node => node.textContent);
try {
  await page.goto(`${site}/dashboard/settings`, { waitUntil: 'networkidle0' }); await text('Saved old name');
  main = { id: 'self', name: 'Partial main' };
  await sync(); await text('主站资料不完整'); assert.equal(posts, 0); assert.ok((await settingsText()).includes('Saved old name'));
  main = { ...completeMain }; await sync(); await text('同步结果未确认'); assert.equal(posts, 1);
  assert.ok((await settingsText()).includes('Saved old name')); assert.equal((await notice()).includes('已同步原子公社资料'), false);
  console.log('PASS: partial main snapshots send no write and a complete but stale HTTP 200 cannot report success or replace saved presentation');

  mode = 'lost'; await sync(); await text('Mock response lost after save'); assert.equal(posts, 2);
  assert.ok((await settingsText()).includes('Saved old name')); assert.equal(profile.name, 'Fresh main name');
  mode = 'hold'; await page.evaluate(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes('同步原子公社资料')); button.click(); button.click(); });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('同步原子公社资料'))?.disabled);
  const end = Date.now() + 5000; while (!held) { if (Date.now() > end) throw new Error('Missing held profile sync'); await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(posts, 3); await held(); await text('已同步原子公社资料'); await text('Fresh main name');
  assert.deepEqual(profile.skills, ['React', 'TypeScript']); assert.equal(profile.isPublic, false); assert.equal(profile.allowCardExchange, false);
  await page.reload({ waitUntil: 'networkidle0' }); await text('Fresh main bio');
  console.log('PASS: lost save responses retain current display until confirmation, retry is locked, normalized skills persist and both privacy flags survive reload');

  mode = 'ok'; main = { id: 'self', name: 'No image account', city: '', province: '', signature: '', skills: [] };
  await sync(); await text('已同步原子公社资料'); await text('No image account');
  assert.equal(profile.avatar, ''); assert.equal(profile.city, ''); assert.equal(profile.bio, ''); assert.deepEqual(profile.skills, []);
  assert.equal((await settingsText()).includes('Fresh main bio'), false);
  await page.reload({ waitUntil: 'networkidle0' }); await text('No image account');
  assert.equal((await settingsText()).includes('Fresh main bio'), false);
  console.log('PASS: mapper-omitted avatar and explicit empty city, bio and skills clear old values and remain cleared after reload');

  main = { id: 'self', name: 'Safe main fallback', phone: {}, city: {}, signature: {}, skills: ['React', {}, null, ' TypeScript '] };
  profile = { userId: 'self', name: {}, avatar: {}, city: {}, bio: {}, skills: 'bad-list', isPublic: 'yes', allowCardExchange: 'no' };
  await page.reload({ waitUntil: 'networkidle0' }); await text('Safe main fallback'); await text('隐私设置暂时无法读取');
  assert.equal(await page.$('#profile-public'), null);
  assert.equal((await settingsText()).includes('页面暂时无法显示'), false);
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: '/tmp/doai-profile-sync-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: malformed legacy display fields use safe strings/lists, invalid privacy remains unconfirmed and settings render on mobile without browser exceptions');
} finally { await browser.close(); }
