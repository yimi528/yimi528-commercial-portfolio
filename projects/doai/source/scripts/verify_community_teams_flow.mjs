import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const site = process.env.TEST_SITE || 'http://127.0.0.1:3219';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
let teams = [], fail = false;
const errors = [];
const open = async (owner, route) => {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => { localStorage.setItem('doai_lang', 'zh'); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== new URL(site).origin) return request.abort();
    if (!url.pathname.includes('/api/')) return request.continue();
    const path = url.searchParams.get('__p') || url.pathname.split('/api/doai/')[1];
    const reply = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/api/user/me') || (url.pathname.endsWith('/api/user') && path === 'me')) return reply({ id: owner, name: owner, phone: '13800000000' });
    if (path === 'teams' && request.method() === 'GET') return fail ? reply({ message: 'offline' }, 503) : reply({ ok: true, teams: teams.map(t => ({ ...t, inviteCode: '' })) });
    if (path === 'teams') {
      const body = JSON.parse(request.postData());
      const team = { id: 'new-team', name: body.name, track: body.track, leaderId: owner, inviteCode: 'a'.repeat(32), desc: '', members: [{ id: owner, name: owner, isLeader: true, roleTitle: '队长' }] };
      teams.push(team); return reply({ ok: true, team });
    }
    if (path === 'my-team') return reply({ ok: true, userId: owner, team: teams.find(t => t.members.some(m => m.id === owner)) || null });
    if (path === 'team-update') { Object.assign(teams[0], JSON.parse(request.postData())); return reply({ ok: true, team: teams[0] }); }
    if (path === 'team-leave') { teams = []; return reply({ ok: true, disbanded: true, team: null }); }
    if (path === 'team-applications') return reply({ ok: true, received: [], sent: [] });
    if (path === 'follows') return reply({ ok: true, following: [], mutual: [] });
    if (path === 'users') return reply({ ok: true, users: [] });
    if (path === 'me') return reply({ ok: true, isAdmin: false });
    if (path === 'site-config') return reply({ ok: true, config: null });
    if (path === 'forum-bookmarks') return reply({ ok: true, userId: owner, bookmarks: [] });
    if (path === 'forum-stats') return reply({ ok: true, forums: [] });
    return reply({ ok: true, notifications: [], registrations: [], tickets: [], cards: [], recruitments: [], talents: [] });
  });
  await page.goto(`${site}/${route}`, { waitUntil: 'domcontentloaded' });
  return page;
};
const text = (page, value) => page.waitForFunction(value => document.querySelector('main')?.textContent.includes(value), { timeout: 18000 }, value);
const click = (page, label) => page.evaluate(label => { const b = [...document.querySelectorAll('main button')].find(n => n.textContent.trim() === label); if (!b) throw new Error(`Missing ${label}`); b.click(); }, label);
try {
  const community = await open('viewer', 'square'); await text(community, '还没有战队');
  const captain = await open('captain', 'dashboard/team'); await text(captain, '创建我的战队');
  await click(captain, '创建战队'); await captain.type('input[placeholder*="Synapse"]', '超级原子战队');
  await captain.evaluate(() => [...document.querySelectorAll('form')].find(f => f.textContent.includes('战队名称')).requestSubmit());
  await text(captain, '战队管理: 超级原子战队');
  // No click in the other tab: its periodic refresh must discover the created team.
  await text(community, '超级原子战队');
  assert.equal(await community.$eval('[data-team-id="new-team"]', n => n.textContent.includes('1/5')), true);
  assert.ok(!(await community.$eval('main', n => n.textContent)).includes('a'.repeat(32)));
  await click(captain, '编辑战队');
  await captain.$eval('form input[required]', n => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(n, '改名后的战队'); n.dispatchEvent(new Event('input', { bubbles: true })); });
  await captain.type('form textarea', '一起打造有用的 AI 产品'); await click(captain, '保存');
  await community.evaluate(() => window.dispatchEvent(new Event('focus'))); await text(community, '改名后的战队'); await text(community, '一起打造有用的 AI 产品');
  teams[0].members.push(...['a', 'b', 'c', 'd'].map(id => ({ id, name: `队员${id}`, isLeader: false, roleTitle: '开发' })));
  await click(community, '刷新战队'); await text(community, '5/5 · 已满员');
  await community.type('input[placeholder="搜索队名、成员或简介"]', '不存在'); await text(community, '没有符合条件的战队');
  await community.$eval('input[placeholder="搜索队名、成员或简介"]', n => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(n, ''); n.dispatchEvent(new Event('input', { bubbles: true })); });
  await text(community, '改名后的战队');
  fail = true; await click(community, '刷新战队'); await text(community, '战队同步失败'); await text(community, '改名后的战队');
  fail = false; await click(community, '刷新战队'); await community.waitForFunction(() => !document.body.textContent.includes('战队同步失败'));
  await (await community.$('section[aria-labelledby="community-teams-title"]')).screenshot({ path: '/tmp/doai-community-teams-desktop.png' });
  await community.setViewport({ width: 390, height: 844 });
  assert.equal(await community.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await community.$eval('#community-teams-title', n => n.scrollIntoView({ block: 'center' }));
  await community.screenshot({ path: '/tmp/doai-community-teams-mobile.png' });
  captain.on('dialog', d => d.accept()); await click(captain, '解散战队');
  await text(captain, '创建我的战队'); await community.evaluate(() => window.dispatchEvent(new Event('focus'))); await text(community, '还没有战队');
  assert.deepEqual(errors, []);
  console.log('PASS: cross-tab create sync, rename and description, full roster, search, failed sync retaining data, retry, dissolution cleanup, no public code, desktop/mobile');
} catch (error) { for (const page of await browser.pages()) console.error(page.url(), (await page.$eval('main', n => n.textContent).catch(() => '')).slice(0,7000)); throw error; } finally { await browser.close(); }
