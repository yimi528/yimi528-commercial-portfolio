import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Local contracts only: no real notifications, relationships or memberships are changed.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'leader', signedIn = true;
const readNotices = new Map();
const names = { leader: '队长账号', peer: '成员账号', applicant: '申请人' };
const directory = [{ id: 'leader', name: names.leader }, { id: 'peer', name: '目录旧名字', roleTitle: '目录旧职位' }, { id: 'applicant', name: names.applicant }];
const cards = { leader: [], peer: [] };
const follows = { leader: [], peer: ['leader'] };
let notificationFails = true, cardsFail = true, usersFail = false, followFails = true, exchangeFails = true, teamFails = false;
let holdCardRead = false, heldCardRead;
let holdExchange = false, heldExchange, exchangePosts = 0;
let holdFollow = false, heldFollow, followPosts = 0;
let holdInvite = false, heldInvite, invitePosts = 0, inviteBody;
let inviteActionFails = false, holdInviteAction = false, heldInviteAction, inviteActionPosts = 0, applicationPosts = 0;
let invitation;
let joinApplication = { id: 'join-1', kind: 'application', teamId: 'team-1', teamName: '可验证战队', fromUserId: 'applicant', fromName: names.applicant, toUserId: 'leader', toName: names.leader, message: '申请加入战队', status: 'pending' };
const members = ['leader'];
const team = () => ({ id: 'team-1', name: '可验证战队', leaderId: 'leader', inviteCode: 'QA-TEAM', track: 'creator', members: members.map(id => ({ id, name: names[id], roleTitle: '开发者', isLeader: id === 'leader' })) });
const waitFor = async predicate => {
  const until = Date.now() + 6000;
  while (!predicate()) {
    if (Date.now() > until) throw new Error('Expected intercepted request did not arrive');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return signedIn ? respond({ id: account, name: names[account], city: '上海', phone: '13800000000' }) : respond({ message: '请先登录' }, 401);
  if (route === '/api/auth/logout') { signedIn = false; return respond({ ok: true }); }
  if (route === '/api/auth/login') { signedIn = true; return respond({ token: `local-${account}` }); }
  if (route === '/api/doai/me') return respond({ isAdmin: false });
  if (route === '/api/doai/notifications/read-ids') { const input = JSON.parse(request.postData()); const read = readNotices.get(account) || new Set(); input.ids.forEach(id => read.add(id)); readNotices.set(account, read); return respond({ ok: true, userId: account, readIds: input.ids }); }
  if (route === '/api/doai/notifications') {
    if (notificationFails) return respond({ message: '消息加载失败' }, 503);
    const notices = [{ id: 'notice-system', type: 'system', title: '正常通知', content: '真实接口格式', read: false, toUserId: 'all', time: '2026-10-26' }];
    if (account === 'leader') notices.push({ id: 'notice-application', type: 'team', title: '收到组队申请', content: '申请人申请入队', read: false, toUserId: 'leader', time: '2026-10-26', applicationId: joinApplication.id, applicationKind: 'application', applicationStatus: joinApplication.status });
    if (account === 'peer' && invitation) notices.push({ id: 'notice-invite', type: 'team', title: '收到战队邀请', content: '可验证战队邀请你加入', read: false, toUserId: 'peer', time: '2026-10-26', applicationId: invitation.id, applicationKind: 'invitation', applicationStatus: invitation.status });
    return respond({ ok: true, notifications: notices.map(row => ({ ...row, read: readNotices.get(account)?.has(row.id) || row.read })) });
  }
  if (route === '/api/doai/cards' && request.method() === 'GET') {
    const rows = [...cards[account]];
    if (cardsFail) return respond({ message: '名片盒加载失败' }, 503);
    if (holdCardRead) { heldCardRead = () => respond({ ok: true, cards: rows }); return; }
    return respond({ ok: true, cards: rows });
  }
  if (route === '/api/doai/cards' && request.method() === 'POST') {
    exchangePosts++;
    if (exchangeFails) return respond({ message: '对方未开放名片交换' }, 403);
    const owner = account, peer = JSON.parse(request.postData()).toUserId;
    const to = { id: peer, name: '服务端新名字', roleTitle: '服务端新职位', skills: ['React'], city: '上海' };
    const from = { id: owner, name: '队长服务端名片', roleTitle: '队长', skills: [], city: '上海' };
    const complete = () => {
      cards.leader = [{ id: 'card-pair', card: to, direction: 'out', exchangedAt: '2026-10-26T13:00:00Z' }];
      cards.peer = [{ id: 'card-pair', card: from, direction: 'in', exchangedAt: '2026-10-26T13:00:00Z' }];
      return respond({ ok: true, exchange: { id: 'card-pair', fromUserId: owner, toUserId: peer, from, to, direction: 'out', at: '2026-10-26T13:00:00Z' } });
    };
    if (holdExchange) { heldExchange = complete; return; }
    return complete();
  }
  if (route === '/api/doai/users') return usersFail ? respond({ message: '目录加载失败' }, 503) : respond({ ok: true, users: directory });
  if (route === '/api/doai/follows') {
    if (request.method() === 'GET') return respond({ ok: true, following: follows[account], mutual: follows[account].filter(id => follows[id]?.includes(account)) });
    followPosts++;
    if (followFails) return respond({ message: '本地模拟关注失败' }, 503);
    const owner = account, peer = JSON.parse(request.postData()).to;
    const complete = () => { follows[owner] = request.method() === 'DELETE' ? follows[owner].filter(id => id !== peer) : [...new Set([...follows[owner], peer])]; return respond({ ok: true, mutual: follows[peer]?.includes(owner) && follows[owner].includes(peer) }); };
    if (holdFollow) { heldFollow = complete; return; }
    return complete();
  }
  if (route === '/api/doai/my-team') return teamFails ? respond({ message: '战队服务失败' }, 503) : respond({ ok: true, team: members.includes(account) ? team() : null });
  if (route === '/api/doai/team-applications' && request.method() === 'GET') {
    const records = [joinApplication, invitation].filter(Boolean);
    return respond({ ok: true, received: records.filter(row => row.toUserId === account && row.status === 'pending'), sent: records.filter(row => row.fromUserId === account) });
  }
  if (route === '/api/doai/team-invitations') {
    invitePosts++; inviteBody = JSON.parse(request.postData());
    if (account !== 'leader' || inviteBody.toUserId !== 'peer') return respond({ message: '队长和被邀请人不匹配' }, 403);
    const complete = () => { invitation = { id: 'invite-1', kind: 'invitation', teamId: 'team-1', teamName: '可验证战队', fromUserId: 'leader', fromName: names.leader, toUserId: 'peer', toName: names.peer, status: 'pending' }; return respond({ ok: true, application: invitation }); };
    if (holdInvite) { heldInvite = complete; return; }
    return complete();
  }
  if (route === '/api/doai/team-invitation-action') {
    inviteActionPosts++;
    if (inviteActionFails) return respond({ message: '本地模拟接受邀请失败' }, 503);
    if (account !== 'peer') return respond({ message: '只有被邀请人可以处理' }, 403);
    const complete = () => { invitation.status = 'accepted'; if (!members.includes('peer')) members.push('peer'); return respond({ ok: true, team: team() }); };
    if (holdInviteAction) { heldInviteAction = complete; return; }
    return complete();
  }
  if (route === '/api/doai/team-application-action') {
    applicationPosts++;
    if (account !== 'leader') return respond({ message: '只有队长可以处理' }, 403);
    joinApplication.status = 'accepted'; members.push('applicant');
    return respond({ ok: true, team: team() });
  }
  if (route === '/api/doai/tickets') return respond({ ok: true, tickets: [] });
  if (route === '/api/doai/registrations') return respond({ ok: true, registrations: [] });
  if (route === '/api/doai/recruitments') return respond({ ok: true, recruitments: [] });
  if (route === '/api/doai/talents') return respond({ ok: true, talents: [] });
  if (route === '/api/doai/site-config') return respond({ ok: true, config: null });
  return respond({ ok: true });
});
const go = route => page.goto(`${site}/${route}`, { waitUntil: 'domcontentloaded' });
const waitText = text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text);
const click = async label => {
  const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label), label);
  assert.ok(handle.asElement(), `Missing button: ${label}`); await handle.asElement().click(); await handle.dispose();
};
const routeInApp = route => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname.replace(/\/$/, '')}/${route}`);
try {
  await go('dashboard');
  await waitText('名片盒暂时无法加载');
  await page.click('button[aria-label="通知"]');
  await waitText('消息暂时无法加载');
  assert.ok(!(await page.$eval('[aria-labelledby="notification-title"]', node => node.textContent)).includes('暂无消息'));
  notificationFails = false;
  await click('重新加载消息'); await waitText('正常通知');
  await page.click('button[aria-label="关闭通知"]');
  cardsFail = false;
  await click('重新加载名片盒');
  await page.waitForFunction(() => !document.body.textContent.includes('名片盒暂时无法加载'));
  console.log('PASS: initial notification/card failures have explicit retry instead of empty success');

  holdCardRead = true; heldCardRead = undefined; usersFail = true;
  await go('square');
  await waitFor(() => heldCardRead);
  await waitText('创客名片暂时无法加载');
  usersFail = false; await click('重新加载创客名片'); await waitText('目录旧名字');
  await click('+ 关注'); await waitText('本地模拟关注失败');
  followFails = false; holdFollow = true;
  await page.$$eval('button', buttons => buttons.filter(button => button.textContent.trim() === '+ 关注').slice(0, 1).forEach(button => { button.click(); button.click(); }));
  await waitFor(() => heldFollow);
  assert.equal(followPosts, 2);
  await heldFollow(); holdFollow = false;
  await waitText('互相关注');
  await click('交换名片'); await waitText('对方未开放名片交换');
  assert.ok(!(await page.$eval('body', node => node.textContent)).includes('名片交换成功'));
  exchangeFails = false; holdExchange = true;
  await page.$$eval('button', buttons => buttons.filter(button => button.textContent.trim() === '交换名片').slice(0, 1).forEach(button => { button.click(); button.click(); }));
  await waitFor(() => heldExchange); assert.equal(exchangePosts, 2);
  await heldExchange(); holdExchange = false; await waitText('名片交换成功');
  await heldCardRead(); holdCardRead = false;
  await routeInApp('dashboard'); await waitText('服务端新名字'); await waitText('服务端新职位');
  assert.ok((await page.$eval('main', node => node.textContent)).includes('已互换的名片盒 (1)'));
  console.log('PASS: follow errors are caught, duplicate writes are blocked, exchange failure never shows success and snapshots survive an older list');

  await routeInApp('square'); await waitText('目录旧名字'); await click('交换名片'); await waitText('名片交换成功');
  await routeInApp('dashboard'); await waitText('服务端新名字');
  assert.ok((await page.$eval('main', node => node.textContent)).includes('已互换的名片盒 (1)'));
  teamFails = true;
  await go('dashboard/team'); await waitText('战队服务暂不可用');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('npm run'));
  teamFails = false; await click('重新加载战队'); await waitText('邀请入队');
  holdInvite = true;
  await page.$$eval('button', buttons => buttons.filter(button => button.textContent.trim() === '邀请入队' && !button.disabled).forEach(button => { button.click(); button.click(); }));
  await waitFor(() => heldInvite);
  assert.equal(invitePosts, 1); assert.equal(inviteBody.toUserId, 'peer'); assert.equal(inviteBody.teamId, 'team-1');
  await heldInvite(); holdInvite = false; await waitText('待处理');
  await click('同意入队');
  await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('成员 2/5') && document.querySelector('main')?.textContent.includes('申请人'));
  await waitFor(() => applicationPosts === 1);
  assert.equal(applicationPosts, 1);
  await page.click('button[aria-label="通知"]'); await waitText('已确认加入');
  await page.click('button[aria-label="关闭通知"]');
  console.log('PASS: repeat exchange stays unique, team load retries, leader invitation includes the recipient and old applicant acceptance remains separate');

  await routeInApp('square'); await waitText('目录旧名字'); holdExchange = true; heldExchange = undefined;
  await click('交换名片'); await waitFor(() => heldExchange);
  await page.click('button[aria-label="账户菜单"]'); await click('退出登录');
  await page.waitForSelector('button[aria-label="账户菜单"]', { hidden: true });
  account = 'peer'; await click('登录');
  await page.type('#atomclub-phone', '13800000000'); await page.type('#atomclub-code', '123456');
  await page.click('[role="dialog"] input[type="checkbox"]'); await click('登录 / 注册');
  await page.waitForSelector('img[alt="成员账号"]');
  await heldExchange(); holdExchange = false;
  await routeInApp('dashboard'); await waitText('队长服务端名片');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('服务端新名字'));
  await routeInApp('dashboard/team'); await waitText('接受邀请');
  assert.ok((await page.$eval('main', node => node.textContent)).includes('创建我的战队'));
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Invitation inbox must fit mobile width');
  await page.screenshot({ path: '/tmp/doai-team-invitation-mobile.png', fullPage: true });
  await page.setViewport({ width: 1440, height: 960 });
  inviteActionFails = true; await click('接受邀请'); await waitText('本地模拟接受邀请失败');
  assert.equal(members.includes('peer'), false);
  inviteActionFails = false; holdInviteAction = true;
  await page.click('button[aria-label="通知"]'); await waitText('收到战队邀请');
  await page.$$eval('button', buttons => buttons.filter(button => button.textContent.trim() === '确认加入').forEach(button => { button.click(); button.click(); }));
  await waitFor(() => heldInviteAction); assert.equal(inviteActionPosts, 2);
  await heldInviteAction(); holdInviteAction = false; await waitText('已确认加入');
  await page.click('button[aria-label="关闭通知"]');
  await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('可验证战队') && !document.querySelector('main')?.textContent.includes('创建我的战队'));
  await go('dashboard/team'); await waitText('可验证战队');
  assert.equal(members.includes('peer'), true);
  assert.deepEqual(errors, []);
  console.log('PASS: late exchange is account-scoped, teamless invitee sees invitations, notification acceptance refreshes team and survives reload');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-social-failure.png', fullPage: true });
  console.error(await page.$eval('body', node => node.textContent));
  throw error;
} finally { await browser.close(); }
