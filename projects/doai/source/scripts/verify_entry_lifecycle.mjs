import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'a';
let signedIn = true;
let holdEntries = false;
let entryFailure = false;
let holdWork = false;
let workFailure = false;
let workPosts = 0;
const heldEntries = [];
let heldEntryWaiter;
const waitForHeldEntry = () => heldEntries.length ? Promise.resolve() : new Promise(resolve => { heldEntryWaiter = resolve; });
let releaseWork;
const fixture = (id, owner = 'a') => ({
  id, ownerUserId: owner, makerId: `MAKER-${id}`, projectName: `项目-${id}`, teamName: '测试团队',
  track: 'industry', type: 'individual', status: 'submitted', projectSummary: '测试项目摘要',
  submittedAt: '2026-10-26', inviteCode: '', videoUrl: '', docUrl: '',
  members: [{ id: owner, name: '同名创客', phone: '13800000000', roleTitle: '开发者', isLeader: true }],
});
const entries = [fixture('first'), fixture('second'), fixture('foreign', 'other'), fixture('account-b', 'b')];
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const api = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${api}/${url.searchParams.get('__p')}` : api;
  const respond = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return respond(signedIn ? { id: account, name: '同名创客', phone: '13800000000', city: '上海' } : { message: '请先登录' }, signedIn ? 200 : 401);
  if (route === '/api/auth/logout') { signedIn = false; return respond({ ok: true }); }
  if (route === '/api/auth/login') { signedIn = true; return respond({ token: 'local-qa-token' }); }
  if (route === '/api/doai/me') return respond({ isAdmin: true });
  if (route === '/api/doai/registrations') {
    // Include the same-named foreign entry to exercise the admin's personal-entry filter.
    const rows = account === 'a' ? entries.filter(row => row.ownerUserId !== 'b') : entries.filter(row => row.ownerUserId === 'b');
    if (holdEntries) {
      heldEntries.push(() => respond({ registrations: rows }));
      heldEntryWaiter?.();
      heldEntryWaiter = undefined;
      return;
    }
    return entryFailure ? respond({ message: '本地模拟服务失败' }, 503) : respond({ registrations: rows });
  }
  if (route === '/api/doai/registration-work') {
    workPosts++;
    const { id, ...links } = JSON.parse(request.postData());
    if (workFailure) return respond({ message: '保存失败，请重试' }, 503);
    const complete = () => {
      const submission = { ...links, submittedAt: '2026-10-26T13:00:00Z' };
      entries.find(row => row.id === id).submission = submission;
      return respond({ submission });
    };
    if (holdWork) { releaseWork = complete; return; }
    return complete();
  }
  if (route === '/api/doai/recruitments') return respond({ recruitments: [] });
  if (route === '/api/doai/talents') return respond({ talents: [] });
  if (route === '/api/doai/tickets') return respond({ tickets: [] });
  if (route === '/api/doai/notifications') return respond({ ok: true, notifications: [] });
  if (route === '/api/doai/cards') return respond({ ok: true, cards: [] });
  if (route === '/api/doai/site-config') return respond({ config: null });
  if (route === '/api/doai/my-team') return respond({ team: null });
  return respond({ ok: true });
});
const go = path => page.goto(`${site}/${path}`, { waitUntil: 'domcontentloaded' });
const text = () => page.$eval('main', node => node.textContent);
const waitText = value => page.waitForFunction(value => document.querySelector('main')?.textContent.includes(value), {}, value);
const click = async label => {
  const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label), label);
  assert.ok(handle.asElement(), `Missing button: ${label}`);
  await handle.asElement().click();
  await handle.dispose();
};
const replace = async (selector, value) => {
  await page.focus(selector);
  await page.$eval(selector, input => input.select());
  if (value) await page.keyboard.type(value);
  else await page.keyboard.press('Backspace');
};
try {
  holdEntries = true;
  await go('detail/project/first');
  await waitText('正在加载报名记录');
  await waitForHeldEntry();
  assert.ok(!(await text()).includes('不存在'));
  holdEntries = false;
  while (heldEntries.length) await heldEntries.shift()();
  await waitText('项目-first');
  assert.equal(await page.$$eval('main a[href=""]', nodes => nodes.length), 0);
  assert.equal(await page.$$eval('main button', nodes => nodes.some(node => node.textContent.includes('复制邀请码'))), false);
  await click('管理作品链接');
  await page.waitForSelector('#work-video');
  assert.ok(!(await text()).includes('项目-foreign'));
  await click('项目-second');
  await page.waitForFunction(() => location.pathname.endsWith('/registrations/second'));
  await page.waitForSelector('#work-video');
  await click('项目-first');
  await page.waitForSelector('#work-video');
  console.log('PASS: delayed entries, non-clickable missing materials, multiple entries and exact identity');

  await replace('#work-video', 'https://video.example/demo');
  await replace('#work-demo', 'https://demo.example/first');
  await replace('#work-github', 'https://github.com/');
  await click('提交作品');
  await waitText('请填写完整的 GitHub 仓库地址');
  assert.equal(workPosts, 0);
  await replace('#work-github', 'https://github.com/local-qa/first');
  holdWork = true;
  await click('提交作品');
  await waitText('正在保存');
  await page.$eval('form[aria-label="提交作品"]', form => { form.requestSubmit(); form.requestSubmit(); });
  assert.equal(workPosts, 1);
  await releaseWork();
  holdWork = false;
  await waitText('作品已提交');
  await click('更新作品链接');
  assert.equal(await page.$eval('#work-demo', node => node.value), 'https://demo.example/first');
  await replace('#work-demo', 'https://demo.example/revised');
  workFailure = true;
  await click('保存作品链接');
  await waitText('保存失败，请重试');
  assert.equal(await page.$eval('#work-demo', node => node.value), 'https://demo.example/revised');
  workFailure = false;
  await click('保存作品链接');
  await waitText('作品已提交');
  await go('detail/project/first');
  await waitText('项目-first');
  for (const link of ['https://video.example/demo', 'https://demo.example/revised', 'https://github.com/local-qa/first']) {
    assert.ok(await page.$(`main a[href="${link}"]`), `Missing submitted material ${link}`);
  }
  await page.setViewport({ width: 390, height: 844 });
  for (const route of ['detail/project/first', 'dashboard/registrations/first']) {
    await go(route);
    await waitText('项目-first');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Mobile overflow: ${route}`);
  }
  await page.screenshot({ path: '/tmp/doai-work-links-mobile.png', fullPage: true });
  await page.setViewport({ width: 1440, height: 960 });
  console.log('PASS: repository validation, duplicate-submit protection, edit retry and persisted material links');

  await go('dashboard/registrations/second');
  await page.waitForSelector('#work-video');
  assert.equal(await page.$eval('#work-video', node => node.required), true);
  for (const field of ['demo', 'github', 'doc']) assert.equal(await page.$eval(`#work-${field}`, node => node.required), false);
  await replace('#work-video', 'https://video.example/second');
  await click('提交作品');
  await waitText('作品已提交');
  assert.equal(entries.find(row => row.id === 'second').submission.demoUrl, '');
  assert.equal(entries.find(row => row.id === 'second').submission.githubUrl, '');
  assert.equal(await page.$$eval('main a[href=""]', nodes => nodes.length), 0);
  await click('更新作品链接');
  await replace('#work-doc', 'https://team.feishu.cn/docx/project');
  await click('保存作品链接');
  await waitText('作品已提交');
  await go('detail/project/second');
  await waitText('项目-second');
  assert.ok(await page.$('main a[href="https://team.feishu.cn/docx/project"]'));
  await go('dashboard/registrations/second');
  await waitText('作品已提交'); await click('更新作品链接');
  assert.equal(await page.$eval('#work-doc', node => node.value), 'https://team.feishu.cn/docx/project');
  await replace('#work-doc', '');
  await click('保存作品链接'); await waitText('作品已提交');
  assert.equal(entries.find(row => row.id === 'second').submission.docUrl, '');
  console.log('PASS: video-only submission, optional demo/GitHub and saved, reloaded and cleared Feishu document');

  entryFailure = true;
  await go('dashboard/registrations');
  await waitText('报名记录暂时无法加载');
  assert.ok(!(await text()).includes('还没有参赛报名'));
  entryFailure = false;
  await click('重新加载报名');
  await waitText('项目-first');
  await go('detail/project/missing');
  await waitText('不存在或已下架');
  await click('返回我的 DOAI');
  await page.waitForFunction(() => location.pathname.endsWith('/dashboard'));
  console.log('PASS: entry-load retry and not-found back navigation');

  holdEntries = true;
  await go('dashboard/settings');
  await waitText('退出登录');
  await waitForHeldEntry();
  await page.waitForFunction(() => !!document.querySelector('main'));
  assert.ok(heldEntries.length > 0);
  await click('退出登录');
  await page.waitForFunction(() => location.pathname.endsWith('/'));
  account = 'b';
  holdEntries = false;
  await click('登录');
  await page.type('#atomclub-phone', '13800000000');
  await page.type('#atomclub-code', '123456');
  await page.click('[role="dialog"] input[type="checkbox"]');
  await click('登录 / 注册');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  // Use UI navigation to retain outstanding A requests in the same app instance.
  await page.evaluate(() => {
    history.pushState({}, '', location.pathname + 'dashboard/registrations');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await waitText('项目-account-b');
  while (heldEntries.length) await heldEntries.shift()();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.ok((await text()).includes('项目-account-b'));
  assert.ok(!(await text()).includes('项目-first'));
  assert.deepEqual(errors, []);
  console.log('PASS: late responses from signed-out account cannot replace the new account entries');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-entry-lifecycle-failure.png', fullPage: true });
  console.error(await text());
  throw error;
} finally {
  await browser.close();
}
