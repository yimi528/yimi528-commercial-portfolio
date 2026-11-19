import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://127.0.0.1:3219';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 1000 });
await page.evaluateOnNewDocument(() => { localStorage.setItem('doai_lang', 'zh'); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
let applied = false, posts = 0, mutual = true, hasTeam = false, full = false, fail = false, joined = false;
let hiddenProfile = false, profilePublic = false, privacyWrites = 0, privacyFail = false;
const teams = Array.from({ length: 13 }, (_, i) => ({ id: `team-${i}`, name: `战队${i}`, track: i % 2 ? 'industry' : 'creator', leaderId: `captain-${i}`, desc: `队伍介绍${i}`, members: [{ id: `captain-${i}`, name: `队长${i}`, isLeader: true, roleTitle: '队长' }] }));
await page.setRequestInterception(true);
page.on('request', request => {
 const url = new URL(request.url());
 if (url.origin !== new URL(site).origin) return request.abort();
 if (!url.pathname.includes('/api/')) return request.continue();
 const path = url.searchParams.get('__p') || url.pathname.split('/api/doai/')[1];
 const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
 if (url.pathname.endsWith('/api/user/me') || (url.pathname.endsWith('/api/user') && path === 'me')) return reply({ id: 'viewer', name: '测试创客', phone: '13800000000' });
 const publicTeam = t => ({ ...t, members: full ? [...t.members, ...['a','b','c','d'].map(id => ({ id, name: id, isLeader: false, roleTitle: '开发' }))] : joined && t.id === 'team-6' ? [...t.members, { id: 'viewer', name: '测试创客', isLeader: false, roleTitle: '开发' }] : t.members });
 if (path === 'teams') {
  const q = url.searchParams.get('search') || '', track = url.searchParams.get('track') || 'all';
  const rows = teams.filter(t => (track === 'all' || t.track === track) && (!q || [t.name, t.desc, ...t.members.map(m => m.name)].some(v => v.includes(q))));
  const pageSize = 6, page = Math.min(Number(url.searchParams.get('page')) || 1, Math.max(1, Math.ceil(rows.length / pageSize)));
  return reply({ ok: true, total: rows.length, page, pageSize, teams: rows.slice((page - 1) * pageSize, page * pageSize).map(publicTeam) });
 }
 if (path?.startsWith('teams/')) { const t = teams.find(t => t.id === path.split('/')[1]); return t ? reply({ ok: true, team: publicTeam(t) }) : reply({ message: '战队不存在' }, 404); }
 if (path === 'my-team') return reply({ ok: true, team: joined ? publicTeam(teams[6]) : hasTeam ? teams[1] : null });
 if (path === 'team-applications' && request.method() === 'POST') {
  posts++; assert.equal(JSON.parse(request.postData()).teamId, 'team-6');
  if (fail) return reply({ message: '模拟申请失败' }, 503);
  applied = true; return reply({ ok: true, application: { teamId: 'team-6', fromUserId: 'viewer', status: 'pending' } });
 }
 if (path === 'team-applications') return reply({ ok: true, received: [], sent: applied ? [{ teamId: 'team-6', status: joined ? 'accepted' : 'pending', kind: 'application' }] : [] });
 if (path === 'follows' && request.method() === 'POST') return reply({ ok: true, mutual: false });
 if (path === 'follows') return reply({ ok: true, following: mutual ? ['captain-6'] : [], mutual: mutual ? ['captain-6'] : [] });
 if (path === 'users') return reply({ ok: true, users: [{ id: 'peer', name: '新注册创客', skills: [], roleTitle: '', city: '上海' }] });
 if (path === 'me') return reply({ ok: true, isAdmin: false, ...(hiddenProfile ? { profile: { userId: 'viewer', isPublic: profilePublic, allowCardExchange: true } } : {}) });
 if (path === 'profile') { privacyWrites++; const body = JSON.parse(request.postData()); assert.equal(body.expectedUserId, 'viewer'); assert.equal(body.isPublicInSquare, true); if (privacyFail) return reply({ message: '模拟隐私保存失败' }, 503); profilePublic = true; return reply({ ok: true, profile: { userId: 'viewer', isPublic: true, allowCardExchange: true } }); }
 if (path === 'site-config') return reply({ ok: true, config: null });
 if (path === 'forum-bookmarks') return reply({ ok: true, userId: 'viewer', bookmarks: [] });
 return reply({ ok: true, forums: [], notifications: [], registrations: [], tickets: [], cards: [], recruitments: [], talents: [] });
});
const text = value => page.waitForFunction(value => document.body.innerText.includes(value), {}, value);
const click = async label => {
 await page.waitForFunction(label => [...document.querySelectorAll('button,a')].some(b => b.textContent.trim() === label && b.getClientRects().length && !b.disabled), {}, label);
 await page.evaluate(label => { const b = [...document.querySelectorAll('button,a')].find(b => b.textContent.trim() === label && b.getClientRects().length && !b.disabled); b.click(); }, label);
};
try {
 await page.goto(`${site}/square`); await text('战队0'); assert.ok(await page.title());
 assert.equal(await page.$$eval('[data-team-id]', nodes => nodes.length), 6);
 await click('下一页'); await text('第 2 / 3 页'); await text('战队6');
 await page.$eval('[data-team-id="team-6"]', n => n.scrollIntoView({ block: 'start' }));
 await page.waitForFunction(() => Number(JSON.parse(sessionStorage.getItem('doai.community:viewer:teams:scroll') || '0')) > 0);
 const savedScroll = await page.evaluate(() => window.scrollY);
 await click('战队6'); await text('申请加入战队'); await text('队伍介绍6');
 await page.type('textarea', '我擅长前端，希望参与开发'); fail = true; await click('申请加入战队'); await text('模拟申请失败'); assert.equal(await page.$eval('textarea', n => n.value), '我擅长前端，希望参与开发');
 fail = false; await click('申请加入战队'); await text('申请已发送'); assert.equal(posts, 2);
 await page.reload(); await text('已申请，等待队长审核');
 joined = true; await text('管理战队'); // The periodic poll must update the page without clicks or reload.
 joined = false;
 applied = false; hasTeam = true; await page.reload(); await text('你已有战队');
 hasTeam = false; full = true; await page.reload(); await text('战队已满员，暂不能申请');
 full = false; mutual = false; await page.reload(); await text('关注队长');
 await click('关注队长'); await text('等待队长回关');
 mutual = true; await click('刷新申请状态'); await page.waitForFunction(() => document.querySelector('textarea') && !document.body.innerText.includes('等待队长回关')); 
 await page.screenshot({ path: '/tmp/doai-team-detail-desktop.png' });
 await page.setViewport({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
 await page.screenshot({ path: '/tmp/doai-team-detail-mobile.png' });
 await click('返回社区战队'); await text('社区战队'); await text('第 2 / 3 页');
 await page.waitForFunction(top => Math.abs(scrollY - top) < 5, {}, savedScroll);
 await page.type('input[placeholder="搜索队名、成员或简介"]', '战队6'); await text('第 1 / 1 页');
 await click('战队6'); await text('队伍介绍6'); await click('返回社区战队'); await text('第 1 / 1 页');
 assert.equal(await page.$eval('input[placeholder="搜索队名、成员或简介"]', n => n.value), '战队6');
 await click('项目合作招募'); await text('申请用于联系发起人'); assert.equal(await page.$eval('[aria-labelledby="community-teams-title"]', n => n.getClientRects().length), 0);
 await click('创客名片墙'); await text('新注册创客'); await page.goto(`${site}/square`); await text('新注册创客');
 assert.equal(await page.$eval('[aria-labelledby="community-teams-title"]', n => n.getClientRects().length), 0);
 await page.goto(`${site}/track/industry`); await text('查看企业真实案例'); await click('查看企业真实案例'); await text('上服集团定制服饰案例及工作流');
 assert.equal(await page.$$eval('#real-cases details', n => n.length), 6); assert.equal(await page.$$eval('#case-workflow li', n => n.length), 6);
 await page.waitForFunction(() => [...document.querySelectorAll('#real-cases details[open] img')].every(n => n.complete && n.naturalWidth > 0));
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
 await page.screenshot({ path: '/tmp/doai-enterprise-case-mobile.png' });
 await page.setViewport({ width: 1440, height: 1000 }); await page.screenshot({ path: '/tmp/doai-enterprise-case-desktop.png' });
 hiddenProfile = true; await page.reload(); await text('你的创客名片当前未展示'); assert.equal(privacyWrites, 0);
 await click('暂时保持隐藏'); assert.equal(privacyWrites, 0); assert.equal(profilePublic, false);
 await page.reload(); await text('你的创客名片当前未展示');
 await page.setViewport({ width: 390, height: 844 });
 await page.screenshot({ path: '/tmp/doai-maker-visibility-prompt-mobile.png' });
 privacyFail = true; await click('开启名片展示'); await text('模拟隐私保存失败'); assert.equal(profilePublic, false);
 privacyFail = false; await click('开启名片展示'); await page.waitForFunction(() => !document.querySelector('[aria-label="创客名片展示提示"]'));
 assert.equal(privacyWrites, 2); assert.equal(profilePublic, true);
 await page.reload(); await text('上服集团定制服饰案例及工作流'); assert.equal(await page.$('[aria-label="创客名片展示提示"]'), null);
 assert.deepEqual(errors, []);
 console.log('PASS: pagination, card navigation, details, application failure/retry/persistence, roster constraints, follow captain, community sections, maker directory, six source cases and workflow, approval polling, restored scroll/search/page/section after detail reloads, legacy privacy prompt failure/retry and opt-in, desktop/mobile, no runtime errors');
} catch (error) { console.error(page.url(), await page.$eval('body', n => n.innerText), errors); throw error; } finally { await browser.close(); }
