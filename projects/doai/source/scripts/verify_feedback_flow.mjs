import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Local, intercepted APIs only: never creates a production registration or sends SMS.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--disable-gpu'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let recruitmentFails = true;
let savedRegistration;
let postedBody;
let posts = 0;
let holdRegistrations = false, releaseRegistrations;
const legacyRegistration = { id: 'qa-old', ownerUserId: 'qa-user', makerId: 'QA-OLD', projectName: '历史项目', teamName: '历史团队', track: 'creator', type: 'individual', status: 'submitted', projectSummary: '历史摘要', submittedAt: '2026-10-25', members: [] };
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const api = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${api}/${url.searchParams.get('__p')}` : api;
  let status = 200;
  let data = { ok: true };
  if (route === '/api/user/me') data = { id: 'qa-user', name: '本地验收', maskedPhone: '138****0000', city: '上海', skills: [] };
  else if (route === '/api/doai/me') data = { isAdmin: false };
  else if (route === '/api/doai/forum-bookmarks') data = { ok: true, userId: 'qa-user', bookmarks: [] };
  else if (route === '/api/doai/forum-stats') data = { ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) };
  else if (route === '/api/doai/recruitments') {
    status = recruitmentFails ? 404 : 200;
    data = recruitmentFails ? { message: 'Cannot GET /api/doai/recruitments' } : { recruitments: [] };
  } else if (route.startsWith('/api/doai/registration-requests/')) {
    data = { ok: true, userId: 'qa-user', requestKey: route.split('/').at(-1), found: false, contactPolicy: 'account', applicantPolicy: 'snapshot-v2' };
  } else if (route === '/api/doai/registrations' && request.method() === 'POST') {
    posts++;
    postedBody = JSON.parse(request.postData());
    savedRegistration = { ...postedBody, id: 'qa-registration', makerId: 'QA-MAKER', inviteCode: 'QA-INVITE', status: 'submitted', submittedAt: '2026-10-26 21:00', ownerUserId: 'qa-user', applicant: postedBody.applicant && { ...postedBody.applicant, userId: 'qa-user' }, accountContact: { userId: 'qa-user', phone: '13800000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } };
    data = { ok: true, userId: 'qa-user', requestKey: postedBody.requestKey, found: true, created: true, registration: savedRegistration, ticket: { id: 'qa-ticket', ownerUserId: 'qa-user', bookingKey: 'registration:qa-registration', title: 'QA', titleEn: 'QA', type: 'maker', holderName: '本地验收', holderPhone: '13800000000', qrCode: 'QA', status: 'claimed', issuedAt: '2026-10-26' } };
  } else if (route === '/api/doai/registrations') {
    data = { registrations: savedRegistration ? [savedRegistration, legacyRegistration] : [legacyRegistration] };
    if (holdRegistrations) { releaseRegistrations = () => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) }); return; }
  }
  else if (route === '/api/doai/tickets') data = { tickets: [] };
  else if (route === '/api/doai/notifications') data = { notifications: [] };
  else if (route === '/api/doai/cards') data = { cards: [] };
  else if (route === '/api/doai/talents') data = { talents: [] };
  else if (route === '/api/doai/site-config') data = { config: null };
  else if (route === '/api/doai/my-team') data = { team: null };
  else if (route === '/api/doai/follows') data = { follows: [] };
  await request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
});
const go = async route => {
  await page.goto(`${site}/${route}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('header, main');
};
const click = async label => {
  const handle = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(button => button.textContent.includes(text)), label);
  assert.ok(handle.asElement(), `Missing button: ${label}`);
  await handle.asElement().click();
  await handle.dispose();
};
const waitText = text => page.waitForFunction(value => document.body.textContent.includes(value), {}, text);
try {
  await page.setViewport({ width: 1440, height: 960 });
  await go('');
  assert.equal(await page.$('[role="alert"]'), null, 'Background failure must not show a global toast');
  await click('项目展示');
  await waitText('入围项目待公布');
  assert.ok(page.url().endsWith('/showcase'));
  await go('');
  await click('Get Tickets').catch(() => click('报名参会'));
  await page.waitForFunction(() => location.pathname.endsWith('/attend'));
  await go('tickets');
  assert.ok((await page.$eval('main', node => node.textContent)).includes('立即报名参会'));
  await go('square');
  await waitText('招募帖暂时无法加载');
  recruitmentFails = false;
  await click('重新加载');
  await waitText('还没有符合条件的招募帖');
  console.log('PASS: showcase, attendance, legacy tickets and local retry');

  await go('maker/tracks');
  assert.equal(await page.$('#maker-overseas'), null);
  assert.equal(await page.$('#maker-timeline'), null);
  for (const id of ['maker-industry', 'maker-creator']) assert.ok((await page.$eval(`#${id}`, node => node.textContent)).includes('报名开放中'));
  await page.screenshot({ path: '/tmp/doai-tracks-desktop.png', fullPage: true });
  await go('track/industry');
  assert.equal(await page.$$eval('main button', nodes => nodes.some(node => /立即报名/.test(node.textContent) && !node.disabled)), true);
  for (const route of ['register/industry', 'register/industry/b-prop-fs', 'register/industry/b-prop-sf']) {
    await go(route);
    await page.waitForSelector('#entry-direction');
    assert.equal(await page.$eval('button[aria-pressed="true"]', node => node.textContent.trim()), 'FDE 赛道 · 企业命题');
    if (route.split('/')[2]) assert.equal(await page.$eval('#entry-direction', node => node.value), route.split('/')[2]);
  }
  await go('register/overseas');
  await page.waitForSelector('#entry-direction');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('海外专场赛道'));
  console.log('PASS: FDE open, programme hidden, overseas removed, registration deep links');
  holdRegistrations = true;
  await page.goto(`${site}/register/creator/ai-infra`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('input[placeholder="请输入姓名"]')?.value === '本地验收');
  const deadline = Date.now() + 5000;
  while (!releaseRegistrations) { if (Date.now() > deadline) throw new Error('Registration read was not intercepted'); await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(await page.$eval('#registration-account-phone', node => node.value), '138****0000');
  await page.$eval('input[placeholder^="例如: 深圳"]', node => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, '成都'); node.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('input[placeholder^="以顿号分隔"]', 'React、 SQL、React');
  await page.select('#entry-direction', 'ai-infra');
  await page.type('#registration-email', 'maker@example.com');
  await page.type('#registration-bio', 'AI 产品开发者，关注真实业务场景。');
  await click('下一步：参赛模式');
  await page.waitForSelector('input[placeholder*="Synapse"]');
  await page.type('input[placeholder*="Synapse"]', '本地验收团队');
  await click('下一步：项目与作品');
  await page.waitForSelector('textarea');
  await page.type('input[placeholder*="NeuroFlow"]', '本地验收项目');
  await page.type('textarea', '验证自由创意方向随报名提交，并在刷新后恢复。');
  await page.select('#entry-direction', '');
  await click('立即提交申报');
  await waitText('请选择具体企业命题或技术方向');
  assert.equal(posts, 0);
  await click('自由创意赛道');
  await page.select('#entry-direction', 'ai-infra');
  assert.equal(await page.$eval('input[placeholder*="NeuroFlow"]', node => node.value), '本地验收项目');
  await click('立即提交申报');
  await waitText('赛事申报提交成功');
  assert.equal(posts, 1);
  assert.equal(postedBody.track, 'creator');
  assert.deepEqual(postedBody.applicant, { name: '本地验收', city: '成都', skills: ['React', 'SQL'], email: 'maker@example.com', bio: 'AI 产品开发者，关注真实业务场景。' });
  assert.equal(postedBody.members.find(member => member.isLeader).phone, '', 'Masked display must not be posted as contact');
  assert.ok(postedBody.projectSummary.startsWith('【申报方向：AI Infra · AI Infra 赛道'));
  await releaseRegistrations(); holdRegistrations = false;
  await click('下一步：提交作品');
  await page.waitForFunction(() => location.pathname.endsWith('/dashboard/registrations/qa-registration'));
  await waitText('历史项目');
  assert.equal(await page.$eval('main h3 button', node => node.textContent), '本地验收项目');
  await go('dashboard/registrations');
  await waitText('AI Infra · AI Infra 赛道');
  await go('detail/project/qa-registration');
  await waitText('AI Infra · AI Infra 赛道');
  await waitText('13800000000');
  await waitText('申报城市：成都'); await waitText('申报技能：React、SQL'); await waitText('maker@example.com'); await waitText('AI 产品开发者，关注真实业务场景。');
  console.log('PASS: required creator direction, draft preservation and persisted entry after reload');

  await go('partner');
  await click('发送合作咨询');
  const contactPosition = await page.$eval('#partnership-contact', node => {
    const box = node.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom };
  });
  await page.waitForFunction(() => document.querySelector('#partnership-contact').getBoundingClientRect().top < innerHeight);
  assert.ok(page.url().endsWith('/partner'));
  assert.ok((await page.$eval('#partnership-contact', node => node.textContent)).includes('jocelyn@atomesh.cn'));
  assert.ok(contactPosition.bottom > 0);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.qaCopied = value; } }, configurable: true }));
  await click('复制合作邮箱');
  await waitText('邮箱已复制');
  assert.equal(await page.evaluate(() => window.qaCopied), 'jocelyn@atomesh.cn');
  console.log('PASS: partnership contact stays on site and copies the email');

  await page.evaluate(() => localStorage.setItem('doai_lang', 'en'));
  await go('');
  await click('Get Tickets');
  await page.waitForFunction(() => location.pathname.endsWith('/attend'));
  await go('showcase');
  await waitText('Finalist projects to be announced');
  await page.setViewport({ width: 390, height: 844 });
  for (const route of ['maker/tracks', 'register/creator', 'register/industry/b-prop-sf', 'register/overseas', 'track/industry', 'tickets', 'showcase', 'partner']) {
    await go(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, `Mobile overflow on ${route}`);
  }
  await go('register/industry/b-prop-sf');
  await page.screenshot({ path: '/tmp/doai-feedback-mobile.png', fullPage: true });
  console.log('PASS: English routes and mobile widths');

  const crawler = await browser.newPage();
  await crawler.setJavaScriptEnabled(false);
  await crawler.goto(`${site}/`, { waitUntil: 'domcontentloaded' });
  assert.ok((await crawler.$eval('body', node => node.textContent)).length > 200);
  assert.ok((await crawler.$eval('h1', node => node.textContent)).includes('DOAI'));
  const image = await crawler.$eval('meta[property="og:image"]', node => node.content);
  assert.ok(image.endsWith('/doai/share-cover.jpg'));
  const response = await fetch(`${site}/share-cover.jpg`);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(errors, []);
  console.log('PASS: readable HTML without JavaScript, share cover and no browser exceptions');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-feedback-failure.png', fullPage: true });
  console.error(await page.$eval('main', node => node.textContent));
  throw error;
} finally {
  await browser.close();
}
