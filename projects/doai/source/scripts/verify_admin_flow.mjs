import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// All business requests are intercepted. No real review, CMS or broadcast is sent.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 1000 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'admin-a', signedIn = true, isAdmin = true;
let cms = { stats: { makers: 4321, finalistProjects: 17, prizePool: '88万', prizePoolEn: 'CNY 880,000', judges: 31 }, announcement: '已保存公告', announcementEn: 'Saved announcement', streamUrl: '' };
let cmsVersion = '2026-10-26T12:00:00.000Z';
let holdCMSRead = true, heldCMSRead, cmsReadFails = false, cmsWriteMode = 'fail', heldCMSSave, cmsPosts = 0, cmsBody;
let reviewMode = 'fail', heldReview, reviewPosts = 0, reviewBody;
let broadcastMode = 'malformed', heldBroadcast, broadcastPosts = 0;
let notificationItems = [], notificationReadFails = false;
let registration = {
  id: 'reg-1', ownerUserId: 'owner-1', makerId: `DOAI-2026-M${'A'.repeat(32)}`, projectName: '待审核项目', teamName: '审查测试团队',
  track: 'industry', type: 'team', status: 'submitted', projectSummary: '【申报方向：FDE-03 · 上服集团】\n项目摘要',
  videoUrl: '', docUrl: '', inviteCode: '', reviewFeedback: '上一轮意见', submittedAt: '2026-10-26', members: [{ name: 'Other teammate', phone: '17777777777', isLeader: false }, { name: 'Actual leader', phone: '19999999999', isLeader: true }],
  applicant: { userId: 'owner-1', name: 'Actual leader', city: '成都', skills: ['React', 'SQL'] },
  accountContact: { userId: 'owner-1', phone: '13600000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' },
  submission: { videoUrl: 'https://video.example/latest', demoUrl: 'https://demo.example/latest', githubUrl: 'https://github.com/owner/latest', submittedAt: '2026-10-26' },
};
const waitFor = async predicate => {
  const until = Date.now() + 5000;
  while (!predicate()) { if (Date.now() > until) throw new Error('Expected intercepted request did not arrive'); await new Promise(resolve => setTimeout(resolve, 10)); }
};
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort();
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return signedIn ? respond({ id: account, name: account, city: '上海', phone: '13800000000' }) : respond({ message: '请先登录' }, 401);
  if (route === '/api/doai/me') return respond({ isAdmin });
  if (route === '/api/auth/logout') { signedIn = false; return respond({ ok: true }); }
  if (route === '/api/auth/login') { signedIn = true; return respond({ token: `local-${account}` }); }
  if (route === '/api/doai/site-config' && request.method() === 'GET') {
    const body = structuredClone({ config: cms, updatedAt: cmsVersion });
    if (holdCMSRead) { heldCMSRead = () => respond(body); return; }
    return cmsReadFails ? respond({ message: '配置读取失败' }, 503) : respond(body);
  }
  if (route === '/api/doai/site-config') {
    cmsPosts++; cmsBody = JSON.parse(request.postData());
    if (cmsBody.expectedUpdatedAt !== cmsVersion) return respond({ message: '配置已被其他管理员修改，请重新加载最新配置' }, 409);
    if (cmsWriteMode === 'fail') return respond({ message: '本地模拟配置保存失败' }, 503);
    const complete = () => { cms = structuredClone(cmsBody.config); cmsVersion = new Date(Date.parse(cmsVersion) + 1).toISOString(); return respond({ config: cms, updatedAt: cmsVersion }); };
    if (cmsWriteMode === 'hold') { heldCMSSave = complete; return; }
    return complete();
  }
  if (route === '/api/doai/registrations') return respond({ registrations: isAdmin ? [registration, { ...registration, id: 'reg-2', makerId: `DOAI-2026-M${'B'.repeat(32)}`, projectName: '=SUM(1,2)', status: 'submitted' }] : [] });
  if (route === '/api/doai/registration-status') {
    reviewPosts++; reviewBody = JSON.parse(request.postData());
    if (reviewMode === 'fail') return respond({ message: '本地模拟审核保存失败' }, 503);
    registration = { ...registration, status: reviewBody.status, reviewFeedback: reviewBody.feedback };
    const result = structuredClone({ registration });
    if (reviewMode === 'hold') { heldReview = () => respond(result); return; }
    return respond(result);
  }
  if (route === '/api/doai/notifications' && request.method() === 'POST') {
    broadcastPosts++;
    if (broadcastMode === 'malformed') return respond({ ok: true });
    if (broadcastMode === 'fail') return respond({ message: '本地模拟群发失败' }, 503);
    const input = JSON.parse(request.postData());
    const complete = () => respond({ notification: { id: 'notice-1', ...input, toUserId: 'all', read: false, time: '2026-10-26' } });
    if (broadcastMode === 'hold') { heldBroadcast = complete; return; }
    return complete();
  }
  if (route === '/api/doai/notifications') return notificationReadFails ? respond({ message: '读取失败' }, 503) : respond({ notifications: notificationItems });
  if (route === '/api/doai/cards') return respond({ cards: [] });
  if (route === '/api/doai/tickets') return respond({ tickets: [] });
  if (route === '/api/doai/recruitments') return respond({ recruitments: [] });
  if (route === '/api/doai/talents') return respond({ talents: [] });
  return respond({ ok: true });
});
const go = route => page.goto(`${site}/${route}`, { waitUntil: 'domcontentloaded' });
const waitText = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = async (label, contains = false) => {
  const handle = await page.evaluateHandle(({ label, contains }) => [...document.querySelectorAll('button')].find(button => contains ? button.textContent.includes(label) : button.textContent.trim() === label), { label, contains });
  assert.ok(handle.asElement(), `Missing button: ${label}`);
  await handle.asElement().evaluate(button => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await handle.asElement().click(); await handle.dispose();
};
const replace = async (selector, value) => { await page.focus(selector); await page.$eval(selector, input => input.select()); await page.keyboard.type(value); };
const valueIs = (selector, value) => page.waitForFunction(({ selector, value }) => document.querySelector(selector)?.value === value, {}, { selector, value });
const routeInApp = route => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname.replace(/\/$/, '')}/${route}`);
try {
  await go('admin'); await waitText('组委会管理中枢'); await waitFor(() => heldCMSRead);
  await click('CMS', true); await page.waitForSelector('#cms-makers');
  assert.equal(await page.$eval('#cms-makers', input => input.matches(':disabled')), true);
  await page.$eval('form[aria-label="首页配置"]', form => form.requestSubmit());
  assert.equal(cmsPosts, 0);
  await heldCMSRead(); holdCMSRead = false;
  await valueIs('#cms-makers', '4321'); await valueIs('#cms-prize-en', 'CNY 880,000');
  assert.equal(await page.$('#admin-channel-filter'), null, 'CMS should not show registration channel controls');
  await page.screenshot({ path: '/tmp/doai-admin-refined-desktop.png', fullPage: true });
  const columns = await page.$$eval('#cms-chinese-title, #cms-english-title', nodes => nodes.map(node => node.getBoundingClientRect().top));
  assert.ok(Math.abs(columns[0] - columns[1]) < 2, 'Language columns should align');
  await page.setViewport({ width: 390, height: 844 });
  await page.select('#admin-section-select', 'cms');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: '/tmp/doai-admin-refined-mobile.png', fullPage: true });
  await page.setViewport({ width: 1360, height: 1000 });

  await replace('#cms-makers', '4322'); await replace('#cms-prize-en', 'CNY 900,000');
  await replace('#cms-announcement-en', 'Updated announcement');
  await click('保存并发布'); await waitText('本地模拟配置保存失败');
  assert.equal(await page.$eval('#cms-makers', input => input.value), '4322');
  cmsWriteMode = 'hold';
  await page.$eval('form[aria-label="首页配置"]', form => { form.requestSubmit(); form.requestSubmit(); });
  await waitFor(() => heldCMSSave); assert.equal(cmsPosts, 2);
  assert.equal(cmsBody.expectedUpdatedAt, '2026-10-26T12:00:00.000Z');
  assert.equal(await page.$eval('#cms-makers', input => input.matches(':disabled')), true);
  await heldCMSSave(); cmsWriteMode = 'ok'; await waitText('已保存，官网首页已更新');
  assert.equal(cms.stats.prizePoolEn, 'CNY 900,000');
  cms = { ...cms, stats: { ...cms.stats, makers: 7777, prizePoolEn: 'CNY 1,000,000' }, announcementEn: 'Other admin announcement' };
  cmsVersion = new Date(Date.parse(cmsVersion) + 500).toISOString();
  await replace('#cms-makers', '4323'); await click('保存并发布'); await waitText('配置已被其他管理员修改');
  assert.equal(cms.stats.makers, 7777);
  assert.equal(await page.$eval('#cms-makers', input => input.value), '4323');
  await click('加载服务器当前值（替换草稿）'); await valueIs('#cms-makers', '7777'); await valueIs('#cms-prize-en', 'CNY 1,000,000');
  await replace('#cms-announcement', '当前管理员修改中文公告'); await click('保存并发布'); await waitText('已保存，官网首页已更新');
  assert.equal(cms.stats.makers, 7777); assert.equal(cms.announcementEn, 'Other admin announcement');
  console.log('PASS: delayed config load, disabled initial writes, failed-save drafts, bilingual fields and stale-version conflict recovery');

  await click('报名评审审核', true); await waitText('待审核项目');
  const assertTableLayout = async () => {
    const sizes = await page.$$eval('tbody tr td:nth-child(5) span', badges => badges.map(badge => ({ height: badge.getBoundingClientRect().height, width: badge.getBoundingClientRect().width })));
    assert.ok(sizes.length > 0 && sizes.every(size => size.height <= 28 && size.width >= 40), 'Status badges must stay on one line with long Maker IDs');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Only the table should scroll horizontally');
  };
  await assertTableLayout();
  await page.screenshot({ path: '/tmp/doai-registration-table-fixed-desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.select('#admin-section-select', 'submissions');
  await page.$eval('[role="region"][aria-label="赛事报名表"]', node => { node.scrollLeft = node.scrollWidth; });
  await assertTableLayout();
  await page.screenshot({ path: '/tmp/doai-registration-table-fixed-mobile.png', fullPage: true });
  await page.setViewport({ width: 1360, height: 1000 });

  assert.equal(await page.$$eval('main tbody a[href=""]', nodes => nodes.length), 0);
  assert.ok(await page.$('main tbody a[href="https://demo.example/latest"]'));
  await click('审核评决');
  await page.waitForSelector('[aria-labelledby="review-title"]');
  for (const link of Object.values(registration.submission).filter(value => value.startsWith('https:'))) assert.ok(await page.$(`[aria-labelledby="review-title"] a[href="${link}"]`));
  assert.equal(await page.$$eval('[aria-labelledby="review-title"] a[href=""]', nodes => nodes.length), 0);
  await valueIs('#review-feedback', '上一轮意见'); await replace('#review-feedback', '请补充真实演示');
  await page.setViewport({ width: 390, height: 844 });
  const bounds = await page.$eval('[aria-labelledby="review-title"]', node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; });
  assert.ok(bounds.left >= 0 && bounds.right <= 391 && bounds.top >= 0 && bounds.bottom <= 845);
  await page.screenshot({ path: '/tmp/doai-admin-review-mobile.png' });
  await page.setViewport({ width: 1440, height: 960 });
  await click('要求补材料'); await waitText('本地模拟审核保存失败');
  assert.ok(await page.$('[aria-labelledby="review-title"]'));
  assert.equal(await page.$eval('#review-feedback', input => input.value), '请补充真实演示');
  reviewMode = 'hold'; heldReview = undefined;
  await page.$$eval('[aria-labelledby="review-title"] button', buttons => buttons.filter(button => ['要求补材料', '初审通过 · 入围决赛'].includes(button.textContent.trim())).forEach(button => { button.click(); button.click(); }));
  await waitFor(() => heldReview); assert.equal(reviewPosts, 2); assert.equal(reviewBody.status, 'needs_info');
  assert.equal(await page.$$eval('[aria-labelledby="review-title"] button', buttons => buttons.every(button => button.disabled)), true);
  await heldReview(); reviewMode = 'ok';
  await page.waitForSelector('[aria-labelledby="review-title"]', { hidden: true });
  await click('审核评决'); await valueIs('#review-feedback', '请补充真实演示'); await click('取消');
  await page.evaluate(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('data:text/csv')) window.qaCSV = this.href; else original.call(this); };
  });
  await click('导出报名数据', true);
  const csv = await page.evaluate(() => decodeURIComponent(window.qaCSV.slice(window.qaCSV.indexOf(',') + 1)));
  for (const link of Object.values(registration.submission).filter(value => value.startsWith('https:'))) assert.ok(csv.includes(link));
  assert.ok(csv.includes('成都')); assert.ok(csv.includes('React、SQL')); assert.ok(csv.includes('Actual leader')); assert.ok(csv.includes('13600000000')); assert.ok(csv.includes('账号绑定')); assert.ok(!csv.includes('19999999999'));
  assert.ok(csv.includes('FDE-03')); assert.ok(csv.includes('"\'=SUM(1,2)"'));
  console.log('PASS: failed review stays open with feedback, duplicate decisions are blocked, latest materials and CSV are complete');

  await click('官方通知'); await page.waitForSelector('#broadcast-title');
  await page.select('select[aria-label="选择通知模板"]', '0');
  assert.ok(await page.$eval('#broadcast-content', input => input.value.includes('【时间】')));
  assert.equal(await page.$eval('form[aria-label="群发站内信"] button[type="submit"]', button => button.disabled), true);
  await replace('#broadcast-title', '【重要】大会签到时间与入场指引');
  await replace('#broadcast-content', '各位创客：\n\n大会签到将于 11 月 8 日 09:00 开始，请携带入场凭证前往一楼服务台。\n\nDOAI 大会组委会');
  await click('CMS', true); await click('官方通知');
  await valueIs('#broadcast-title', '【重要】大会签到时间与入场指引');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: '/tmp/doai-notices-desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: '/tmp/doai-notices-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewport({ width: 1360, height: 1000 });
  await click('预览并确认');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.$eval('dialog', dialog => dialog.getBoundingClientRect().width <= innerWidth), true);
  await page.screenshot({ path: '/tmp/doai-notices-confirm.png' });
  await page.setViewport({ width: 1360, height: 1000 });
  assert.equal(broadcastPosts, 0);
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('dialog', dialog => dialog.open), false);
  await click('预览并确认'); await page.click('#broadcast-confirm-scope');
  await click('确认发送站内信'); await waitText('通知发送未完成');
  assert.ok(await page.$eval('#broadcast-content', input => input.value.includes('一楼服务台')));
  broadcastMode = 'hold';
  await page.$eval('form[aria-label="确认群发站内信"]', form => { form.requestSubmit(); form.requestSubmit(); });
  await waitFor(() => heldBroadcast); assert.equal(broadcastPosts, 2);
  assert.equal(await page.$eval('#broadcast-content', input => input.matches(':disabled')), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('dialog', dialog => dialog.open), true);
  await heldBroadcast(); broadcastMode = 'ok'; await waitText('站内信已下发'); await valueIs('#broadcast-title', '');
  assert.equal(await page.$eval('dialog', dialog => dialog.open), false);
  assert.ok(await page.$eval('section[aria-labelledby="broadcast-history-title"]', section => section.textContent.includes('【重要】大会签到时间与入场指引')));
  notificationItems = [
    { id: 'public', type: 'system', toUserId: 'all', title: '全站历史公告', content: '公告详细内容', time: '2026-10-30', read: false },
    { id: 'private', type: 'system', toUserId: account, title: '仅发给个人', content: '个人通知', time: '2026-10-30', read: false },
    { id: 'review', type: 'review', toUserId: 'all', title: '审核通知', content: '审核内容', time: '2026-10-30', read: false },
  ];
  await click('刷新通知'); await waitText('全站历史公告');
  const historyText = await page.$eval('section[aria-labelledby="broadcast-history-title"]', section => section.textContent);
  assert.ok(!historyText.includes('仅发给个人')); assert.ok(!historyText.includes('审核通知'));
  await page.click('section[aria-labelledby="broadcast-history-title"] summary');
  assert.equal(await page.$eval('section[aria-labelledby="broadcast-history-title"] details', detail => detail.open), true);
  notificationReadFails = true; await click('刷新通知'); await waitText('通知读取失败');
  notificationReadFails = false; await click('刷新通知'); await waitText('全站历史公告');
  console.log('PASS: templates require completion, drafts survive tab switches, preview sends nothing, confirmation is required, mobile fits, failed sends preserve input, duplicate sends are blocked and history filters/refresh recovers');

  cmsReadFails = true; await go('admin'); await waitText('组委会管理中枢'); await click('CMS', true); await waitText('当前配置无法读取');
  const before = cmsPosts; await page.$eval('form[aria-label="首页配置"]', form => form.requestSubmit()); assert.equal(cmsPosts, before);
  cmsReadFails = false; await click('重新加载配置'); await valueIs('#cms-makers', '7777');
  await click('报名评审审核', true); await waitText('待审核项目'); await click('审核评决'); await replace('#review-feedback', 'A 管理员的审核');
  reviewMode = 'hold'; heldReview = undefined; await click('要求补材料'); await waitFor(() => heldReview);
  await routeInApp('dashboard/settings'); await waitText('退出登录'); await click('退出登录'); await page.waitForSelector('button[aria-label="账户菜单"]', { hidden: true });
  account = 'admin-b'; await click('登录'); await page.type('#atomclub-phone', '13800000000'); await page.type('#atomclub-code', '123456');
  await page.click('[role="dialog"] input[type="checkbox"]'); await click('登录 / 注册'); await page.waitForSelector('img[alt="admin-b"]');
  await routeInApp('admin'); await waitText('组委会管理中枢'); await click('报名评审审核', true); await waitText('待审核项目'); await click('审核评决');
  await replace('#review-feedback', 'B 管理员的新草稿'); await heldReview(); reviewMode = 'ok';
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.ok(await page.$('[aria-labelledby="review-title"]')); await valueIs('#review-feedback', 'B 管理员的新草稿'); await click('取消');
  await routeInApp('dashboard/settings'); await waitText('同步原子公社资料'); isAdmin = false; await click('重新读取账号');
  // Assert the resulting permission boundary after refresh; the loading screen can remount the profile editor.
  await routeInApp('admin'); await waitText('此页面需要 DOAI 管理员权限');
  await routeInApp('detail/project/reg-1'); await waitText('不存在或已下架');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('待审核项目'));
  assert.deepEqual(errors, []);
  console.log('PASS: config load retry, late review cannot close another administrator draft, permission changes clear private list caches');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-admin-failure.png', fullPage: true });
  console.error(await page.$eval('body', node => node.textContent)); throw error;
} finally { await browser.close(); }
