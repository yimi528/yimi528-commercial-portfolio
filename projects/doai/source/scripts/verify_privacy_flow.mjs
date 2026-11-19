import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
// All account and privacy APIs are intercepted; no real privacy setting is changed.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(String(error)));
let account = 'a', signedIn = true, mode = 'malformed', posts = 0, syncs = 0, reads = 0, heldSave, heldSync, expire = false, meFails = false;
const profiles = Object.fromEntries(['a', 'b'].map(userId => [userId, { userId, name: `Profile ${userId}`, city: '上海', bio: '', skills: [], isPublic: false, allowCardExchange: false }]));
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url()); if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/')); const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') { reads++; return signedIn ? reply({ id: account, name: `Main ${account}`, avatarUrl: '', city: '上海', phone: '13800000000', signature: 'New main bio', skills: ['React'] }) : reply({ message: '请先登录' }, 401); }
  if (route === '/api/doai/me') return meFails ? reply({ message: 'Profile unavailable' }, 503) : reply({ isAdmin: false, profile: profiles[account] });
  if (route === '/api/auth/logout') { signedIn = false; return reply({ ok: true }); }
  if (route === '/api/auth/login') { signedIn = true; return reply({ token: `mock-${account}` }); }
  if (route === '/api/doai/profile') {
    posts++; const owner = account, input = JSON.parse(request.postData());
    assert.equal(input.expectedUserId, owner);
    if (expire) return reply({ message: '登录过期' }, 401);
    if (mode === 'malformed') return reply({ ok: true });
    if (mode === 'fail') return reply({ error: { message: '本地隐私保存失败' } }, 503);
    const complete = () => {
      profiles[owner] = { ...profiles[owner], ...(input.isPublicInSquare === undefined ? {} : { isPublic: input.isPublicInSquare }), ...(input.allowCardExchange === undefined ? {} : { allowCardExchange: input.allowCardExchange }) };
      return reply({ ok: true, profile: profiles[owner] });
    };
    if (mode === 'hold') { heldSave = complete; return; } return complete();
  }
  if (route === '/api/doai/profile-sync') {
    syncs++; const input = JSON.parse(request.postData()), owner = account;
    heldSync = () => { profiles[owner] = { ...profiles[owner], name: input.name, avatar: input.avatar, city: input.city, bio: input.bio, skills: input.skills }; return reply({ ok: true, isAdmin: false, profile: profiles[owner] }); }; return;
  }
  for (const key of ['registrations','tickets','notifications','cards','recruitments','talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null });
  return reply({ ok: true });
});
const wait = async fn => { const end = Date.now() + 5000; while (!fn()) { if (Date.now() > end) throw new Error('Missing intercepted request'); await new Promise(resolve => setTimeout(resolve, 10)); } };
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = async label => { const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label), label); assert.ok(handle.asElement(), `Missing ${label}`); await handle.asElement().evaluate(node => node.click()); await handle.dispose(); };
const checked = (selector, expected) => page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.checked === expected, {}, { selector, expected });
const route = path => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname}/${path}`);
try {
  await page.goto(`${site}/dashboard/settings`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#profile-public');
  await page.click('#profile-public'); await text('隐私设置保存结果未确认'); await checked('#profile-public', false);
  assert.equal(profiles.a.isPublic, false);
  mode = 'fail'; await page.click('#profile-public'); await text('本地隐私保存失败'); await checked('#profile-public', false);
  mode = 'hold'; const beforePosts = posts, beforeReads = reads;
  await page.evaluate(() => {
    document.querySelector('#profile-public').click(); document.querySelector('#profile-public').click(); document.querySelector('#profile-exchange').click();
    const buttons = [...document.querySelectorAll('button')]; buttons.find(node => node.textContent.includes('同步原子公社资料')).click(); buttons.find(node => node.textContent.trim() === '重新读取账号').click();
  }); await wait(() => heldSave); assert.equal(posts, beforePosts + 1); assert.equal(reads, beforeReads); assert.equal(syncs, 0);
  assert.equal(await page.$eval('#profile-exchange', node => node.matches(':disabled')), true);
  await route('conference'); await route('dashboard/settings'); await page.waitForSelector('#profile-public');
  assert.equal(await page.$eval('#profile-public', node => node.matches(':disabled')), true);
  await heldSave(); mode = 'ok'; await checked('#profile-public', true);
  await page.click('#profile-exchange'); await text('隐私设置已保存'); await checked('#profile-exchange', true);
  await page.reload({ waitUntil: 'domcontentloaded' }); await checked('#profile-public', true); await checked('#profile-exchange', true);
  console.log('PASS: malformed and failed writes preserve privacy, confirmed values survive reload, and repeated writes/read/sync are locked even across navigation');

  await click('同步原子公社资料'); await wait(() => heldSync);
  const beforeSyncSave = posts; await page.$eval('#profile-public', node => node.click()); assert.equal(posts, beforeSyncSave);
  assert.equal(await page.$eval('#profile-exchange', node => node.matches(':disabled')), true);
  await heldSync(); await text('已同步原子公社资料'); await checked('#profile-public', true); await checked('#profile-exchange', true);
  mode = 'hold'; heldSave = null; await page.click('#profile-public'); await wait(() => heldSave);
  await click('退出登录'); await page.waitForFunction(() => !document.querySelector('#profile-public'));
  account = 'b'; await route('dashboard/settings'); await click('使用原子公社账号登录'); await page.waitForSelector('#atomclub-phone'); await page.type('#atomclub-phone', '13800000000'); await page.type('#atomclub-code', '123456'); await page.click('[role="dialog"] input[type="checkbox"]'); await click('登录 / 注册');
  await page.waitForSelector('#profile-public'); await checked('#profile-public', false);
  await heldSave(); await checked('#profile-public', false); assert.equal(profiles.b.isPublic, false);
  mode = 'ok'; await page.click('#profile-exchange'); await text('隐私设置已保存'); await checked('#profile-exchange', true);
  console.log('PASS: privacy stays intact during profile sync and an old account response cannot change or lock a newly signed-in account');

  await page.setViewport({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await page.$eval('section[aria-label="隐私设置"]', node => node.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: '/tmp/doai-privacy-mobile.png' });
  meFails = true; await click('重新读取账号'); await text('隐私设置暂时无法读取');
  assert.equal((await page.$eval('section[aria-label="隐私设置"]', node => node.textContent)).includes('隐私设置已保存'), false);
  assert.equal(await page.$('#profile-public'), null); assert.equal(await page.$('#profile-exchange'), null);
  meFails = false; await click('重新读取账号'); await page.waitForSelector('#profile-public'); await checked('#profile-exchange', true);
  expire = true; await page.click('#profile-public'); await text('登录已过期'); await page.waitForSelector('#atomclub-phone');
  assert.equal(profiles.b.isPublic, false); assert.deepEqual(errors, []);
  console.log('PASS: failed supplemental privacy read hides unconfirmed controls, explicit refresh recovers them, and expired save opens sign-in without changing public flags');
} finally { await browser.close(); }
