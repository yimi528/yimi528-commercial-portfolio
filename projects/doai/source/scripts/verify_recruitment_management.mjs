import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Intercept every business request; never delete real community content.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const base = { track: 'creator', summary: '面向大会现场的 AI 协作工具，寻找擅长交互设计与前端开发的伙伴。\n已有产品原型，希望一起完成 Demo。', neededRoles: ['前端开发', '交互设计'], skills: ['React', 'TypeScript'], stage: 'prototype', city: '上海', isRemote: true, leader: { id: 'owner', name: '林小满', avatar: '', city: '上海' }, likes: 2, status: 'open', createdAt: '2026-10-29T12:00:00Z' };
let posts = [
  { ...base, id: 'p1', title: '让 AI 成为创客的协作伙伴', applicationsCount: 3 },
  { ...base, id: 'p2', title: 'FDE 智能制造项目招募', track: 'industry', applicationsCount: 12, createdAt: '2026-10-28T12:00:00Z' },
  { ...base, id: 'p3', title: '开源知识助手已完成组队', status: 'filled', applicationsCount: 5, leader: { ...base.leader, name: '陈知行' }, createdAt: '2026-10-27T12:00:00Z' },
];
let readMode = 'hold', heldRead, deleteMode = 'fail', heldDelete, deletes = 0;
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort();
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (route === '/api/user/me') return respond({ id: 'qa-admin', name: '管理员', phone: '13800000000', city: '上海' });
  if (route === '/api/doai/me') return respond({ isAdmin: true });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: [] });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: 'qa-admin', bookmarks: [] });
  if (route === '/api/doai/site-config') return respond({ config: null });
  if (route === '/api/doai/recruitments') {
    if (readMode === 'hold') { heldRead = () => respond({ recruitments: posts }); return; }
    return readMode === 'fail' ? respond({ message: '本地模拟读取失败' }, 503) : respond({ recruitments: posts });
  }
  if (route.startsWith('/api/doai/recruitments/') && request.method() === 'DELETE') {
    deletes++;
    if (deleteMode === 'fail') return respond({ message: '本地模拟删除失败' }, 503);
    const complete = () => { posts = posts.filter(post => post.id !== route.split('/').at(-1)); return respond({ ok: true }); };
    if (deleteMode === 'hold') { heldDelete = complete; return; }
    return complete();
  }
  const lists = { notifications: [], registrations: [], tickets: [], cards: [], talents: [], users: [], following: [], mutual: [] };
  return respond({ ok: true, ...lists });
});
const waitText = text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text);
const click = async text => {
  const button = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text), text);
  assert.ok(button.asElement(), `Missing button: ${text}`);
  await button.asElement().click(); await button.dispose();
};
const replace = async (selector, text) => { await page.focus(selector); await page.$eval(selector, element => element.select()); await page.keyboard.type(text); };
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
const screenshot = name => page.screenshot({ path: `/tmp/recruitment-${name}.png`, fullPage: true });
try {
  await page.goto(`${site}/admin`, { waitUntil: 'domcontentloaded' });
  await waitText('组委会管理中枢'); await click('招募帖管理'); await waitText('正在读取招募帖…');
  assert.ok(heldRead); readMode = 'fail'; await heldRead();
  await click('刷新'); await waitText('招募帖暂时无法读取');
  readMode = 'ok'; await click('重新加载'); await waitText(posts[0].title);
  await noOverflow(); await screenshot('desktop');
  await replace('input[type="search"]', '陈知行');
  await page.waitForFunction(() => document.querySelectorAll('[aria-labelledby="admin-section-title"] li').length === 1);
  await replace('input[type="search"]', '不存在的内容'); await waitText('没有符合条件的招募帖');
  await click('清除筛选');
  await page.select('select:has(option[value="industry"])', 'industry');
  await page.waitForFunction(() => document.querySelectorAll('[aria-labelledby="admin-section-title"] li').length === 1);
  await click('清除筛选');
  await page.select('select:has(option[value="applications"])', 'applications');
  assert.ok((await page.$eval('[aria-labelledby="admin-section-title"] li', element => element.textContent)).includes('FDE 智能制造'));
  const openTab = await page.$('[aria-label="按招募状态筛选"] button:nth-child(2)'); await openTab.click();
  assert.equal(await page.$$eval('[aria-labelledby="admin-section-title"] li', items => items.length), 2);
  await click('让 AI 成为创客的协作伙伴'); await page.waitForSelector('dialog[open]'); await screenshot('detail');
  await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { hidden: true });
  await click('让 AI 成为创客的协作伙伴'); await click('删除招募帖');
  assert.equal(await page.$$eval('dialog button', buttons => buttons.find(button => button.textContent.trim() === '确认永久删除').disabled), true);
  await click('取消'); assert.equal(deletes, 0);
  await click('删除招募帖'); await page.click('dialog input[type="checkbox"]'); await click('确认永久删除');
  await waitText('本地模拟删除失败'); assert.equal(deletes, 1); assert.ok(await page.$('dialog[open]'));
  deleteMode = 'hold';
  await page.evaluate(() => { const button = [...document.querySelectorAll('dialog button')].find(element => element.textContent.trim() === '确认永久删除'); button.click(); button.click(); });
  await page.waitForFunction(() => document.body.textContent.includes('正在删除…'));
  assert.equal(deletes, 2); await page.keyboard.press('Escape'); assert.ok(await page.$('dialog[open]'));
  assert.ok(heldDelete); await heldDelete(); await page.waitForSelector('dialog[open]', { hidden: true });
  await waitText('已删除「让 AI 成为创客的协作伙伴」'); assert.equal(posts.length, 2);
  await noOverflow();
  await page.setViewport({ width: 390, height: 844 }); await noOverflow(); await screenshot('mobile');
  await click('FDE 智能制造项目招募'); await page.waitForSelector('dialog[open]'); await noOverflow(); await screenshot('mobile-detail');
  await page.keyboard.press('Escape'); await page.setViewport({ width: 1440, height: 1000 });
  await click('清除筛选'); posts = []; await click('刷新'); await waitText('广场还没有招募帖'); await screenshot('empty');
  await click('前往组队广场'); await page.waitForFunction(() => location.pathname.endsWith('/square/recruit'));
  assert.deepEqual(errors, []);
  console.log('PASS: loading, read error/retry, search, track/status filters, sorting, empty state, desktop/mobile layout, modal keyboard behavior, delete confirmation/failure/retry and duplicate prevention; no live data changed.');
} catch (error) {
  console.error(await page.evaluate(() => document.body.innerText));
  console.error(errors);
  throw error;
} finally { await browser.close(); }
