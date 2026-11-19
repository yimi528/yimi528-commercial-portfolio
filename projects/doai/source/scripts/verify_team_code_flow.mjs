import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const code = 'abcdef0123456789abcdef0123456789';
const members = ['captain'];
const errors = [];
let failSync = false, failJoin = false, joinPosts = 0, delayedJoin;
const team = () => ({ id: 'team', name: '同步测试战队', track: 'creator', leaderId: 'captain', inviteCode: code, members: members.map(id => ({ id, name: id === 'captain' ? '队长' : '新队友', isLeader: id === 'captain', roleTitle: '开发者' })) });
const open = async owner => {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.origin !== new URL(site).origin) return request.abort();
    if (!url.pathname.includes('/api/')) return request.continue();
    const path = url.searchParams.get('__p') || url.pathname.split('/api/doai/')[1];
    const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.endsWith('/api/user/me') || (url.pathname.endsWith('/api/user') && url.searchParams.get('__p') === 'me')) return reply({ id: owner, name: owner, phone: '13800000000' });
    if (path === 'my-team') return failSync ? reply({ message: '同步失败' }, 503) : reply({ ok: true, userId: owner, team: members.includes(owner) ? team() : null });
    if (path === 'team-join') {
      joinPosts++;
      const body = JSON.parse(request.postData());
      assert.deepEqual(Object.keys(body), ['inviteCode']);
      if (failJoin || body.inviteCode.toLowerCase() !== code) return reply({ ok: false, message: '邀请码无效，请向队长确认' }, 400);
      delayedJoin = () => { if (!members.includes(owner)) members.push(owner); return reply({ ok: true, team: team() }); };
      return;
    }
    if (path === 'team-applications') return reply({ ok: true, received: [], sent: [] });
    if (path === 'follows') return reply({ ok: true, following: [], mutual: [] });
    if (path === 'users') return reply({ ok: true, users: [] });
    if (path === 'site-config') return reply({ ok: true, config: null });
    if (path === 'me') return reply({ ok: true, isAdmin: false });
    if (path === 'forum-bookmarks') return reply({ ok: true, userId: owner, bookmarks: [] });
    if (path === 'forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, i) => ({ id: `forum-${i + 1}`, bookedCount: 0, checkedInCount: 0 })) });
    return reply({ ok: true, notifications: [], cards: [], tickets: [], registrations: [], recruitments: [], talents: [] });
  });
  await page.goto(`${site}/dashboard/team`, { waitUntil: 'domcontentloaded' });
  return page;
};
const text = (page, value) => page.waitForFunction(value => document.querySelector('main')?.textContent.includes(value), { timeout: 16000, polling: 100 }, value);
const click = (page, label) => page.evaluate(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label)?.click(), label);
try {
  const captain = await open('captain'); await text(captain, '成员 1/5');
  const peer = await open('peer'); await text(peer, '使用邀请码加入战队');
  // Model two visible clients even though Chrome backgrounds inactive tabs.
  await captain.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
  await peer.type('#team-invite-code', 'invalid'); await click(peer, '加入战队'); await text(peer, '邀请码无效');
  assert.equal(members.includes('peer'), false);
  await peer.$eval('#team-invite-code', input => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await peer.type('#team-invite-code', code.toUpperCase());
  await peer.evaluate(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '加入战队'); button.click(); button.click(); });
  await peer.waitForFunction(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '加入战队')?.disabled);
  const deadline = Date.now() + 5000;
  while (!delayedJoin) { if (Date.now() > deadline) throw new Error('Missing join request'); await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(joinPosts, 2, 'Duplicate clicks must submit once');
  await delayedJoin(); await text(peer, '成员 2/5');
  // No navigation or action in the captain page: its timer must discover the teammate.
  await text(captain, '成员 2/5'); await text(captain, '新队友');
  await click(captain, '编辑战队');
  const nameInput = await captain.$('form input'); await nameInput.type('未保存');
  members.splice(members.indexOf('peer'), 1);
  await captain.evaluate(() => window.dispatchEvent(new Event('focus')));
  await text(captain, '成员 1/5');
  assert.ok((await captain.$eval('form input', input => input.value)).endsWith('未保存'), 'Background sync must preserve unsaved edits');
  failSync = true; await click(captain, '刷新队伍'); await text(captain, '同步失败，当前显示上次成功读取的资料');
  await text(captain, '成员 1/5');
  failSync = false; await click(captain, '刷新队伍');
  await captain.waitForFunction(() => !document.body.textContent.includes('同步失败，当前显示'));
  await peer.reload({ waitUntil: 'domcontentloaded' }); await text(peer, '使用邀请码加入战队');
  for (const page of [captain, peer]) {
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Team page must fit mobile width');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: invalid code errors, session-bound code join, duplicate-click lock, two-page automatic sync, focus refresh, edit preservation, sync retry, reload and mobile layout');
} catch (error) { for (const page of await browser.pages()) console.error((await page.$eval('body', node => node.textContent).catch(() => '')).slice(-4500)); throw error; } finally { await browser.close(); }
