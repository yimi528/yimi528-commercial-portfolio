import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
// Every API is intercepted. No production account, SMS, registration or notification is used.
async function scenario() {
  const context = await browser.createBrowserContext(), page = await context.newPage(), errors = [];
  const state = { signedIn: true, profileWrites: 0, posts: [], gets: [], ledger: new Map(), rows: [], loseNext: false, malformedNext: false, oldBackend: false, holdNext: false, release: null };
  page.on('pageerror', error => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => { localStorage.setItem('doai_lang', 'zh'); localStorage.setItem('user_token', 'qa-token'); });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    // Business regressions use local fallback fonts, independent of Google Fonts availability.
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return request.abort();
    if (!url.pathname.includes('/api/')) return request.continue();
    const path = url.pathname.slice(url.pathname.indexOf('/api/'));
    const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
    const reply = (value, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (route === '/api/user/me') return state.signedIn ? reply({ id: 'qa-user', name: 'Retry owner', maskedPhone: '138****0000', city: '上海' }) : reply({ message: 'Sign in' }, 401);
    if (route === '/api/auth/login') { state.signedIn = true; return reply({ token: 'qa-token' }); }
    if (request.method() === 'POST' && ['/api/doai/profile', '/api/doai/profile-sync'].includes(route)) { state.profileWrites++; return reply({ ok: true }); }
    if (route === '/api/doai/me') return reply({ isAdmin: !!state.admin, profile: { userId: 'qa-user' } });
    if (route.startsWith('/api/doai/registration-requests/')) {
      const key = route.split('/').at(-1); state.gets.push(key);
      if (state.oldBackend) return reply({ message: 'Cannot GET registration-requests' }, 404);
      const value = state.ledger.get(key) || { ok: true, userId: 'qa-user', requestKey: key, found: false, contactPolicy: 'account', applicantPolicy: 'snapshot-v2' };
      if (state.oldApplicantPolicy && !value.found) return reply({ ...value, applicantPolicy: undefined });
      if (state.oldContactPolicy && !value.found) return reply({ ...value, contactPolicy: undefined });
      return reply({ ...value, ...(value.found ? { created: false } : {}) });
    }
    if (route === '/api/doai/registrations' && request.method() === 'POST') {
      const input = JSON.parse(request.postData()); state.posts.push(input);
      assert.equal(input.expectedUserId, 'qa-user'); assert.equal(request.headers()['x-doai-actor'], 'qa-user');
      const id = `entry-${state.rows.length + 1}`;
      const registration = { ...input, id, ownerUserId: 'qa-user', makerId: `DOAI-2026-M${String(state.rows.length + 1).padStart(32, '0')}`, status: 'submitted', submittedAt: '2026-10-27T00:00:00Z', applicant: input.applicant && { ...input.applicant, userId: 'qa-user' }, accountContact: { userId: 'qa-user', phone: '13800000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } };
      const ticket = { id: `pass-${id}`, ownerUserId: 'qa-user', bookingKey: `registration:${id}`, type: 'maker', status: 'claimed', qrCode: `QR-${id}`, issuedAt: '2026-10-27T00:00:00Z', holderName: 'Retry owner', holderPhone: '13800000000', title: 'Test pass' };
      const value = { ok: true, userId: 'qa-user', requestKey: input.requestKey, found: true, created: true, registration, ticket };
      state.rows.push(registration); state.ledger.set(input.requestKey, value);
      const complete = () => {
        if (state.loseNext) { state.loseNext = false; return request.abort('failed'); }
        if (state.malformedNext) { state.malformedNext = false; return reply({ ok: true, registration }); }
        return reply(value);
      };
      if (state.holdNext) { state.holdNext = false; state.release = complete; return; }
      return complete();
    }
    if (route === '/api/doai/forum-stats') return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
    if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: 'qa-user', bookmarks: [] });
    if (route === '/api/doai/site-config') return reply({ config: null });
    if (route === '/api/doai/registrations') return reply({ registrations: state.rows });
    if (route === '/api/doai/tickets') return reply({ tickets: [...state.ledger.values()].map(value => value.ticket) });
    for (const key of ['tickets', 'cards', 'notifications', 'recruitments', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
    return reply({ ok: true });
  });
  const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
  const click = async value => page.evaluate(value => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes(value));
    if (!button || button.disabled) throw new Error(`Button unavailable: ${value}`);
    button.click();
  }, value);
  const go = () => page.goto(`${site}/register/creator/ai-infra`, { waitUntil: 'domcontentloaded' });
  const fill = async (name = 'Retry project') => {
    await page.waitForFunction(() => document.querySelector('input[placeholder="请输入姓名"]')?.value === 'Retry owner');
    assert.equal(await page.$eval('#registration-email', node => node.required), true);
    assert.equal(await page.$eval('#registration-bio', node => node.required), true);
    await click('下一步：参赛模式');
    assert.ok(await page.$('#registration-email'), 'Missing mandatory email and bio must keep the applicant step open');
    await page.type('#registration-email', 'maker@example.com');
    await page.type('#registration-bio', 'AI developer');
    await click('下一步：参赛模式');
    await page.waitForSelector('input[placeholder*="Synapse"]');
    assert.ok((await page.$eval('main', node => node.textContent)).includes('138****0000'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.type('input[placeholder*="Synapse"]', 'Retry team');
    await click('下一步：项目与作品');
    await page.waitForSelector('textarea');
    await page.type('input[placeholder*="NeuroFlow"]', name);
    await page.type('textarea', 'Retry summary');
  };
  const wait = async fn => { const end = Date.now() + 5000; while (!fn()) { if (Date.now() > end) throw new Error('Missing intercepted write'); await new Promise(resolve => setTimeout(resolve, 10)); } };
  const waitError = () => page.waitForFunction(() => document.querySelector('.bg-red-50') && [...document.querySelectorAll('button')].some(button => button.textContent.includes('立即提交申报') && !button.disabled));
  return { context, page, state, errors, text, click, go, fill, wait, waitError };
}
try {
  {
    const s = await scenario(); try {
      await s.page.setViewport({ width: 390, height: 844 });
      await s.page.goto(`${site}/maker`, { waitUntil: 'domcontentloaded' });
      await s.page.waitForSelector('#maker-overseas'); await s.page.click('#maker-overseas'); await s.text('海外专场沿用');
      await s.click('立即报名'); await s.page.waitForSelector('#overseas-country');
      assert.ok(s.page.url().includes('/register/overseas'));
      assert.equal(await s.page.$eval('#overseas-country', node => node.required), true);
      assert.equal(await s.page.$eval('#overseas-university', node => node.required), true);
      await s.page.select('#entry-direction', 'ai-app');
      await s.page.type('#registration-email', 'maker@example.com'); await s.page.type('#registration-bio', 'AI developer');
      await s.click('下一步：参赛模式'); assert.ok(await s.page.$('#overseas-country'));
      await s.page.type('#overseas-country', 'United Kingdom');
      await s.click('下一步：参赛模式'); assert.ok(await s.page.$('#overseas-university'));
      await s.page.type('#overseas-university', 'University of Oxford');
      await s.page.screenshot({ path: '/tmp/doai-overseas-registration-mobile.png', fullPage: true });
      await s.click('下一步：参赛模式'); await s.text('02. 参赛模式与团队成员');
      await s.click('个人独立参赛'); await s.click('下一步：项目与作品'); await s.text('03. 申报项目信息');
      await s.page.type('input[placeholder*="NeuroFlow"]', 'Overseas project'); await s.page.type('textarea', 'Overseas project summary');
      s.state.loseNext = true; await s.click('立即提交申报'); await s.waitError();
      assert.equal(s.state.posts.length, 1); assert.ok(s.state.posts[0].projectSummary.includes('University of Oxford'));
      assert.ok(s.state.posts[0].projectSummary.includes('United Kingdom'));
      await s.click('立即提交申报'); await s.text('已确认已有报名'); await s.text('University of Oxford');
      assert.equal(s.state.posts.length, 1); assert.equal(s.state.rows.length, 1);
      await s.page.goto(`${site}/detail/project/entry-1`, { waitUntil: 'domcontentloaded' });
      await s.text('University of Oxford'); await s.text('United Kingdom'); await s.text('海外专场赛道');
      await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.text('University of Oxford');
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      s.state.admin = true; await s.page.goto(`${site}/admin`, { waitUntil: 'domcontentloaded' });
      await s.text('组委会管理中枢'); await s.text('100% (1 个项目)');
      await s.click('报名评审审核'); await s.text('Overseas project');
      await s.page.type('input[placeholder*="搜索项目"]', 'Oxford'); await s.text('Overseas project');
      await s.click('审核评决'); await s.text('University of Oxford'); await s.text('United Kingdom');
      assert.deepEqual(s.errors, []);
      console.log('PASS: overseas card and mobile form require country/university; lost-response recovery, refresh and admin review retain affiliation');
    } finally { await s.context.close(); }
  }
  {
    const s = await scenario(); try {
      s.state.signedIn = false; await s.go();
      const replace = (selector, value) => s.page.$eval(selector, (node, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
      await replace('input[placeholder="请输入姓名"]', 'Draft Name');
      await replace('input[placeholder^="例如: 深圳"]', '成都');
      await replace('input[placeholder^="以顿号分隔"]', 'React、 SQL、React');
      await s.page.type('#registration-email', 'maker@example.com'); await s.page.type('#registration-bio', 'AI developer');
      await s.click('下一步：参赛模式'); await s.page.waitForSelector('#atomclub-phone');
      await s.page.type('#atomclub-phone', '13800000000'); await s.page.type('#atomclub-code', '123456');
      await s.page.click('[role="dialog"] input[type="checkbox"]'); await s.click('登录 / 注册');
      await s.page.waitForSelector('#atomclub-phone', { hidden: true });
      assert.equal(await s.page.$eval('input[placeholder="请输入姓名"]', node => node.value), 'Draft Name');
      assert.equal(await s.page.$eval('input[placeholder^="例如: 深圳"]', node => node.value), '成都');
      assert.equal(await s.page.$eval('input[placeholder^="以顿号分隔"]', node => node.value), 'React、 SQL、React');
      await s.click('下一步：参赛模式'); await s.page.type('input[placeholder*="Synapse"]', 'Draft team');
      await s.click('下一步：项目与作品'); await s.page.type('input[placeholder*="NeuroFlow"]', 'Draft project'); await s.page.type('textarea', 'Snapshot details');
      await s.click('立即提交申报'); await s.text('赛事申报提交成功'); await s.text('申报城市：成都'); await s.text('申报技能：React、SQL'); await s.text('申报邮箱：maker@example.com'); await s.text('个人简介：AI developer');
      assert.deepEqual(s.state.posts[0].applicant, { name: 'Draft Name', city: '成都', skills: ['React', 'SQL'], email: 'maker@example.com', bio: 'AI developer' });
      await s.page.setViewport({ width: 390, height: 844 });
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await s.page.goto(`${site}/dashboard/passport`, { waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('.passport-show-code'); await s.click('出示入场码'); await s.page.waitForSelector('dialog[open]');
      const passport = await s.page.evaluate(() => {
        const id = document.querySelector('[data-testid="maker-identifier"]'), qr = document.querySelector('dialog[open] [data-testid="passport-qr"] svg');
        const code = qr?.getBoundingClientRect();
        return { id: id?.textContent.trim(), qrLeft: code?.left, qrRight: code?.right, qrTop: code?.top, qrBottom: code?.bottom, width: innerWidth, height: innerHeight, qrCount: document.querySelectorAll('[data-testid="passport-qr"] svg, [data-testid="ticket-qr"] svg').length };
      });
      assert.equal(passport.id, s.state.rows[0].makerId); assert.equal(passport.qrCount, 1);
      assert.ok(passport.qrLeft >= 0 && passport.qrRight <= passport.width && passport.qrTop >= 0 && passport.qrBottom <= passport.height);
      await s.page.keyboard.press('Escape'); await s.page.waitForSelector('dialog[open]', { hidden: true });
      assert.equal(s.state.profileWrites, 0); assert.deepEqual(s.errors, []);
      console.log('PASS: first sign-in preserves applicant drafts, the saved receipt confirms city/skills and registration does not modify account or public-card profiles');
    } finally { await s.context.close(); }
  }
  {
    const s = await scenario(); try {
      await s.page.setViewport({ width: 390, height: 844 });
      await s.go(); await s.fill(); s.state.loseNext = true; s.state.holdNext = true;
      await s.page.evaluate(() => { const form = document.querySelector('main form'); form.requestSubmit(); form.requestSubmit(); });
      await s.wait(() => s.state.release); assert.equal(s.state.posts.length, 1); assert.equal(s.state.gets.length, 1);
      await s.state.release(); await s.waitError();
      assert.equal(await s.page.$eval('input[placeholder*="NeuroFlow"]', node => node.value), 'Retry project');
      const saved = s.state.ledger.values().next().value;
      saved.registration.status = 'rejected'; saved.registration.reviewFeedback = 'Saved review decision'; saved.ticket.status = 'checked_in';
      await s.click('立即提交申报'); await s.text('已确认已有报名'); await s.text('未通过'); await s.text('Saved review decision');
      await s.text('报名联系方式：138****0000');
      assert.equal((await s.page.$eval('main', node => node.textContent)).includes('13800000000'), false);
      assert.equal(s.state.posts.length, 1); assert.equal(s.state.rows.length, 1); assert.equal(s.state.gets[0], s.state.gets[1]);
      assert.equal(await s.page.$$('button').then(async buttons => (await Promise.all(buttons.map(button => button.evaluate(node => node.textContent)))).filter(text => text.includes('下一步：提交作品')).length), 0);
      await s.click('查看报名及审核意见'); assert.ok(s.page.url().endsWith('/dashboard/registrations/entry-1'));
      assert.deepEqual(s.errors, []);
      console.log('PASS: same-frame duplicate submit is locked, lost response recovers one entry via GET and preserves actual rejected/check-in state');
    } finally { await s.context.close(); }
  }
  {
    const s = await scenario(); try {
      await s.go(); await s.fill(); s.state.loseNext = true; await s.click('立即提交申报'); await s.waitError();
      const originalKey = s.state.posts[0].requestKey;
      await s.go(); await s.fill('Different draft'); await s.click('立即提交申报'); await s.text('已保存项目：Retry project');
      assert.equal(s.state.posts.length, 1); assert.equal(s.state.gets.at(-1), originalKey);
      assert.equal(await s.page.$eval('input[placeholder*="NeuroFlow"]', node => node.value), 'Different draft');
      await s.page.setViewport({ width: 390, height: 844 });
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await s.click('另报项目（保留当前草稿）'); await s.click('立即提交申报'); await s.text('赛事申报提交成功');
      assert.equal(s.state.posts.length, 2); assert.notEqual(s.state.posts[1].requestKey, originalKey); assert.equal(s.state.posts[1].projectName, 'Different draft');
      assert.deepEqual(s.errors, []);
      console.log('PASS: recovery key survives reload, changed draft cannot overwrite a saved entry and explicit new entry retains the draft on mobile');
    } finally { await s.context.close(); }
  }
  {
    const s = await scenario(); try {
      await s.go(); await s.fill(); s.state.malformedNext = true; await s.click('立即提交申报'); await s.text('报名回执未确认');
      await s.waitError(); await s.click('立即提交申报'); await s.text('已确认已有报名');
      assert.equal(s.state.posts.length, 1); assert.equal(s.state.rows.length, 1); assert.deepEqual(s.errors, []);
      console.log('PASS: an HTTP 200 without a complete confirmed receipt retains retry state and recovers without a second POST');
    } finally { await s.context.close(); }
  }
  {
    const s = await scenario(); try {
      await s.go(); await s.fill(); s.state.oldBackend = true; await s.click('立即提交申报'); await s.waitError();
      assert.equal(s.state.posts.length, 0); s.state.oldBackend = false; s.state.oldContactPolicy = true;
      await s.click('立即提交申报'); await s.text('报名联系方式暂不可确认'); assert.equal(s.state.posts.length, 0);
      s.state.oldContactPolicy = false; s.state.oldApplicantPolicy = true; await s.click('立即提交申报'); await s.text('报名资料保存服务暂不可确认'); assert.equal(s.state.posts.length, 0);
      s.state.oldApplicantPolicy = false; await s.click('立即提交申报'); await s.text('赛事申报提交成功');
      assert.equal(s.state.posts.length, 1); assert.deepEqual(s.errors, []);
      console.log('PASS: an older backend without receipt support receives no POST; retry works when the compatible service is available');
    } finally { await s.context.close(); }
  }
} finally { await browser.close(); }
