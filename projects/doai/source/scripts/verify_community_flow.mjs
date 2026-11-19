import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// All requests are local contracts: no public post, like, application or notification is written.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
let account = 'a', signedIn = false;
const names = { a: '候选 A', b: '候选 B', owner: '项目发起人' };
const basePost = { id: 'post-1', track: 'creator', title: '伙伴招募', summary: '寻找项目合作伙伴', neededRoles: ['前端'], skills: ['TypeScript'], stage: 'idea', city: '上海', isRemote: true, leader: { id: 'owner', name: names.owner, avatar: `${site}/missing-avatar.png`, city: '上海' }, status: 'open', createdAt: '2026-10-26T12:00:00Z' };
const oldPost = { ...basePost, id: 'old-post', title: `列表之外的旧招募 ${'AgentMeshDistributedWorkflowCoordinator'.repeat(2)}` };
const posts = [basePost];
const likes = new Map();
const applications = [];
const notices = [];
let feedFails = true, holdFeed = false, heldFeed;
let detailFails = false, holdDetail = true, heldDetail;
let likeMode = 'fail', heldLike, likePosts = 0, likeBody;
let applyMode = 'ok', heldApply, applyPosts = 0, applyBody;
let publishMode = 'fail', heldPublish, publishPosts = 0, publishBody;
let applicationReadFails = true, decisionMode = 'fail', heldDecision, decisionPosts = 0;
const waitFor = async predicate => { const until = Date.now() + 6000; while (!predicate()) { if (Date.now() > until) throw new Error('Expected intercepted request did not arrive'); await new Promise(resolve => setTimeout(resolve, 10)); } };
const findPost = id => posts.find(post => post.id === id) || (id === oldPost.id ? oldPost : null);
const snapshot = (post, actor) => {
  const application = applications.find(row => row.recruitmentId === post.id && row.applicant.id === actor);
  return { ...post, likes: likes.get(post.id)?.size || 0, hasLiked: Boolean(actor && likes.get(post.id)?.has(actor)), hasApplied: Boolean(application), applicationStatus: application?.status, applicationsCount: applications.filter(row => row.recruitmentId === post.id).length };
};
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const actor = signedIn ? account : null;
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (route === '/api/doai/forum-bookmarks') return respond({ ok: true, userId: actor, bookmarks: [] });
  if (route === '/api/doai/forum-stats') return respond({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (route === '/api/user/me') return actor ? respond({ id: actor, name: names[actor], phone: '13800000000', city: '上海', skills: ['TypeScript'] }) : respond({ message: '请先登录' }, 401);
  if (route === '/api/doai/me') return respond({ isAdmin: false });
  if (route === '/api/auth/login') { signedIn = true; return respond({ token: `local-${account}` }); }
  if (route === '/api/auth/logout') { signedIn = false; return respond({ ok: true }); }
  if (route === '/api/doai/recruitments' && request.method() === 'GET') {
    const data = structuredClone({ recruitments: posts.map(post => snapshot(post, actor)) });
    if (holdFeed) { heldFeed = () => respond(data); return; }
    return feedFails ? respond({ message: '列表暂不可用' }, 503) : respond(data);
  }
  if (route === '/api/doai/recruitments' && request.method() === 'POST') {
    publishPosts++; publishBody = JSON.parse(request.postData());
    if (publishMode === 'fail') return respond({ message: '本地模拟发布失败' }, 503);
    const input = structuredClone(publishBody), owner = actor;
    const complete = () => { const post = { ...input, id: `post-${posts.length + 1}`, leader: { id: owner, name: names[owner], avatar: '', city: '上海' }, status: 'open', createdAt: '2026-10-27T12:00:00Z' }; posts.unshift(post); return respond({ recruitment: snapshot(post, owner) }); };
    if (publishMode === 'hold') { heldPublish = complete; return; }
    return complete();
  }
  const detail = /^\/api\/doai\/recruitments\/([^/]+)$/.exec(route);
  if (detail && request.method() === 'GET') {
    const post = findPost(detail[1]);
    if (!post) return respond({ message: '招募不存在' }, 404);
    const data = structuredClone({ recruitment: snapshot(post, actor) });
    if (holdDetail) { heldDetail = () => respond(data); return; }
    return detailFails ? respond({ message: '详情暂不可用' }, 503) : respond(data);
  }
  const like = /^\/api\/doai\/recruitments\/([^/]+)\/like$/.exec(route);
  if (like) {
    likePosts++; likeBody = JSON.parse(request.postData());
    if (!actor) return respond({ message: '请先登录' }, 401);
    if (likeMode === 'fail') return respond({ message: '本地模拟点赞失败' }, 503);
    const desired = likeBody.liked;
    if (typeof desired !== 'boolean') return respond({ message: '需要明确点赞状态' }, 400);
    const complete = () => { const set = likes.get(like[1]) || new Set(); desired ? set.add(actor) : set.delete(actor); likes.set(like[1], set); return respond({ hasLiked: desired, likes: set.size }); };
    if (likeMode === 'hold') { heldLike = complete; return; }
    return complete();
  }
  const apply = /^\/api\/doai\/recruitments\/([^/]+)\/apply$/.exec(route);
  if (apply) {
    applyPosts++; applyBody = JSON.parse(request.postData());
    if (applyMode === 'fail') return respond({ message: '本地模拟申请失败' }, 503);
    const message = applyBody.message;
    const complete = () => {
      let row = applications.find(row => row.recruitmentId === apply[1] && row.applicant.id === actor);
      if (!row) {
        row = { id: `application-${actor}`, recruitmentId: apply[1], applicant: { id: actor, name: names[actor], avatar: '', city: '上海' }, message, status: 'pending', createdAt: '2026-10-27T12:00:00Z' };
        applications.push(row);
        // Deliberately retain a pre-fix leading-slash link to test stored notifications.
        notices.push({ id: `notice-${notices.length}`, toUserId: 'owner', type: 'community', title: '收到招募申请', content: `${names[actor]} 申请项目合作`, time: '2026-10-27', read: false, link: `/detail/recruit/${apply[1]}` });
      }
      return respond({ hasApplied: true, applicationStatus: row.status, applicationsCount: applications.filter(item => item.recruitmentId === apply[1]).length });
    };
    if (applyMode === 'hold') { heldApply = complete; return; }
    return complete();
  }
  const inbox = /^\/api\/doai\/recruitments\/([^/]+)\/applications$/.exec(route);
  if (inbox) {
    if (actor !== findPost(inbox[1])?.leader.id) return respond({ message: '只有发起人可以查看' }, 403);
    return applicationReadFails ? respond({ message: '申请读取失败' }, 503) : respond({ applications: applications.filter(row => row.recruitmentId === inbox[1]) });
  }
  if (route === '/api/doai/recruitment-application-action') {
    decisionPosts++;
    if (actor !== 'owner') return respond({ message: '禁止处理' }, 403);
    if (decisionMode === 'fail') return respond({ message: '本地模拟处理失败' }, 503);
    const { id, action } = JSON.parse(request.postData());
    const complete = () => {
      const row = applications.find(row => row.id === id);
      row.status = action === 'accept' ? 'accepted' : 'declined';
      notices.push({ id: `notice-${notices.length}`, toUserId: row.applicant.id, type: 'community', title: row.status === 'accepted' ? '愿意进一步沟通' : '本次暂不合适', content: '招募申请已有结果', time: '2026-10-27', read: false, link: `detail/recruit/${row.recruitmentId}` });
      return respond({ ok: true, application: { id, recruitmentId: row.recruitmentId, status: row.status } });
    };
    if (decisionMode === 'hold') { heldDecision = complete; return; }
    return complete();
  }
  if (route === '/api/doai/notifications/read-ids') { const input = JSON.parse(request.postData()); for (const row of notices) if (row.toUserId === actor && input.ids.includes(row.id)) row.read = true; return respond({ ok: true, userId: actor, readIds: input.ids }); }
  if (route === '/api/doai/notifications') return respond({ notifications: notices.filter(row => row.toUserId === actor) });
  if (route === '/api/doai/talents') return respond({ talents: [] });
  if (route === '/api/doai/registrations') return respond({ registrations: [] });
  if (route === '/api/doai/tickets') return respond({ tickets: [] });
  if (route === '/api/doai/cards') return respond({ cards: [] });
  if (route === '/api/doai/users') return respond({ ok: true, users: [] });
  if (route === '/api/doai/follows') return respond({ ok: true, following: [], mutual: [] });
  if (route === '/api/doai/site-config') return respond({ config: null });
  return respond({ ok: true });
});
const go = route => page.goto(`${site}/${route}`, { waitUntil: 'domcontentloaded' });
const routeInApp = route => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname.replace(/\/$/, '')}/${route}`);
const waitText = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const click = async (label, contains = false) => {
  // Route loads can replace a retry button between scrolling and clicking.
  // Reacquire only detached handles; API and content failures still fail normally.
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle = await page.evaluateHandle(({ label, contains }) => [...document.querySelectorAll('button')].find(button => contains ? button.textContent.includes(label) : button.textContent.trim() === label), { label, contains });
    assert.ok(handle.asElement(), `Missing button: ${label}`);
    try {
      await handle.asElement().evaluate(button => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await handle.asElement().click(); return;
    } catch (error) {
      if (attempt === 2 || !String(error).includes('detached')) throw error;
    } finally { await handle.dispose(); }
  }
};
const replace = async (selector, value) => { await page.focus(selector); await page.$eval(selector, input => input.select()); await page.keyboard.type(value); };
const login = async id => {
  account = id;
  if (!await page.$('#atomclub-phone')) await click('登录');
  await page.type('#atomclub-phone', '13800000000'); await page.type('#atomclub-code', '123456'); await page.click('[role="dialog"] input[type="checkbox"]');
  await click('登录 / 注册'); await page.waitForSelector(`img[alt="${names[id]}"]`);
};
const logout = async () => { await page.click('button[aria-label="账户菜单"]'); await click('退出登录'); await page.waitForSelector('button[aria-label="账户菜单"]', { hidden: true }); };
const clearError = async () => { for (const button of await page.$$('[role="alert"] button')) await button.click(); };
try {
  await go('detail/recruit/post-1'); await waitFor(() => heldDetail); await waitText('正在读取招募信息');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('不存在'));
  await heldDetail(); holdDetail = false; await waitText('伙伴招募');
  await page.type('#rc-name', '访客草稿称呼'); await page.type('#rc-skills', 'JavaScript'); await page.type('#rc-msg', '未登录时填写的草稿');
  await page.click('main button[aria-pressed]'); await page.waitForSelector('#atomclub-phone'); assert.equal(likePosts, 0);
  await login('a'); await waitText('伙伴招募');
  await page.waitForSelector('#rc-msg');
  assert.equal(await page.$eval('#rc-msg', input => input.value), '未登录时填写的草稿');
  await page.click('main button[aria-pressed]'); await waitText('本地模拟点赞失败'); await clearError();
  assert.equal(await page.$eval('main button[aria-pressed]', button => button.getAttribute('aria-pressed')), 'false');
  likeMode = 'hold';
  await page.$eval('main button[aria-pressed]', button => { button.click(); button.click(); }); await waitFor(() => heldLike); assert.equal(likePosts, 2);
  await heldLike(); likeMode = 'ok';
  await page.waitForFunction(() => document.querySelector('main button[aria-pressed]')?.getAttribute('aria-pressed') === 'true');
  await page.click('main button[aria-pressed]'); await page.waitForFunction(() => document.querySelector('main button[aria-pressed]')?.getAttribute('aria-pressed') === 'false');
  assert.equal(likeBody.liked, false);
  detailFails = true; await routeInApp('detail/recruit/old-post'); await waitText('招募详情暂时无法加载');
  detailFails = false; await click('重新加载招募详情'); await waitText('列表之外的旧招募');
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Valid long titles must wrap on mobile');
  await page.setViewport({ width: 1440, height: 960 });
  await routeInApp('detail/recruit/missing'); await waitText('不存在或已下架'); await click('返回组队广场'); await waitText('招募帖暂时无法加载');
  feedFails = false; await click('重新加载'); await waitText('伙伴招募');
  console.log('PASS: anonymous likes prompt login, detail loading/errors are distinct from missing records, and explicit like retries submit once');

  await routeInApp('detail/recruit/post-1'); await page.waitForSelector('#rc-msg');
  await replace('#rc-name', '我自己的称呼'); await replace('#rc-skills', 'TypeScript 与 Rust'); await replace('#rc-msg', '我愿意参与前端开发。');
  await click('发送申请'); await waitText('申请已经提交');
  assert.ok(applyBody.message.includes('我自己的称呼')); assert.ok(applyBody.message.includes('TypeScript 与 Rust'));
  assert.equal(applications.length, 1); assert.equal(applyPosts, 1);
  notices.push({ id: 'arrived-later', toUserId: 'a', type: 'community', title: '新到达的通知', content: '打开通知时读取最新消息', time: '2026-10-27', read: false, link: 'detail/recruit/post-1' });
  await page.click('button[aria-label="通知"]'); await waitText('新到达的通知'); await page.click('button[aria-label="关闭通知"]');
  await logout(); await login('b'); await routeInApp('square'); await waitText('伙伴招募');
  assert.ok(!(await page.$eval('main', node => node.textContent)).includes('已申请'));
  assert.equal(await page.$eval('main button[aria-label="心动"]', button => button.getAttribute('aria-pressed')), 'false');
  await click('申请加入'); await page.waitForSelector('#recruit-apply-message'); await replace('#recruit-apply-message', 'B 账号的申请留言');
  applyMode = 'fail'; await click('发送加入申请'); await waitText('本地模拟申请失败');
  assert.equal(await page.$eval('#recruit-apply-message', input => input.value), 'B 账号的申请留言');
  applyMode = 'hold';
  await page.$eval('[aria-label="申请参与项目"] form', form => { form.requestSubmit(); form.requestSubmit(); }); await waitFor(() => heldApply); assert.equal(applyPosts, 3);
  assert.equal(await page.$eval('#recruit-apply-message', input => input.disabled), true);
  await heldApply(); applyMode = 'ok'; await waitText('申请已提交'); await click('知道了');
  likeMode = 'hold'; heldLike = undefined; await page.click('main button[aria-label="心动"]'); await waitFor(() => heldLike);
  await logout(); await login('owner'); await heldLike(); likeMode = 'ok';
  await page.click('button[aria-label="通知"]'); await waitText('收到招募申请'); await click('招募'); await click('查看详情');
  await page.waitForFunction(() => location.pathname.endsWith('/detail/recruit/post-1') && !location.pathname.includes('//detail'));
  await waitText('申请暂时无法加载'); assert.equal(await page.$('#rc-msg'), null);
  applicationReadFails = false; await click('重新加载申请'); await waitText('我自己的称呼'); await waitText('B 账号的申请留言');
  assert.equal(await page.$eval('main button[aria-pressed]', button => button.getAttribute('aria-pressed')), 'false');
  console.log('PASS: applicant metadata persists, account flags do not bleed, failed forms keep drafts, and legacy community notifications reach the owner inbox');

  const applicantCard = id => page.evaluateHandle(name => [...document.querySelectorAll('[aria-label="收到的招募申请"] article')].find(article => article.querySelector('h3')?.textContent === name), names[id]);
  let card = await applicantCard('a'); await card.asElement().$$eval('button', buttons => buttons[0].click()); await card.dispose(); await waitText('本地模拟处理失败');
  assert.equal(applications.find(row => row.applicant.id === 'a').status, 'pending');
  decisionMode = 'hold'; card = await applicantCard('a'); await card.asElement().$$eval('button', buttons => { buttons[0].click(); buttons[0].click(); }); await card.dispose();
  await waitFor(() => heldDecision); assert.equal(decisionPosts, 2); await heldDecision(); decisionMode = 'ok'; await waitText('处理结果已保存');
  await page.waitForFunction(name => [...document.querySelectorAll('[aria-label="收到的招募申请"] article')].find(article => article.querySelector('h3')?.textContent === name)?.querySelectorAll('button')[1]?.disabled === false, {}, names.b);
  card = await applicantCard('b'); await card.asElement().$$eval('button', buttons => buttons[1].click()); await card.dispose();
  await waitFor(() => applications.find(row => row.applicant.id === 'b').status === 'declined');
  await logout(); await login('a'); await routeInApp('detail/recruit/post-1'); await waitText('发起人愿意进一步沟通');
  assert.equal(await page.$('[aria-label="收到的招募申请"]'), null);
  await logout(); await login('b'); await routeInApp('detail/recruit/post-1'); await waitText('本次申请暂不合适');
  console.log('PASS: owners can decide once, failures keep pending rows, results survive login/reload and private inboxes stay hidden from applicants');

  holdFeed = true; heldFeed = undefined; await go('square'); await waitFor(() => heldFeed); await click('发布项目招募');
  await page.type('#publish-title', '我的新招募'); await page.type('#publish-summary', '新项目完整介绍'); await page.type('#publish-city', '上海'); await page.click('#publish-remote');
  await page.type('#publish-roles', Array.from({ length: 21 }, (_, i) => `role-${i}`).join(','));
  await click('发布招募帖'); await waitText('标签最多 20 项'); assert.equal(publishPosts, 0);
  await replace('#publish-roles', '前端、前端、产品'); await page.type('#publish-skills', 'TypeScript,React,React'); await page.select('#publish-stage', 'idea');
  await click('发布招募帖'); await waitText('本地模拟发布失败'); assert.equal(await page.$eval('#publish-title', input => input.value), '我的新招募');
  publishMode = 'hold';
  await page.$eval('form[aria-label="发布招募表单"]', form => { form.requestSubmit(); form.requestSubmit(); }); await waitFor(() => heldPublish); assert.equal(publishPosts, 2);
  assert.equal(await page.$eval('#publish-title', input => input.matches(':disabled')), true);
  assert.deepEqual(publishBody.neededRoles, ['前端', '产品']); assert.deepEqual(publishBody.skills, ['TypeScript', 'React']); assert.equal(publishBody.stage, 'idea');
  assert.equal(publishBody.isRemote, true);
  await heldPublish(); publishMode = 'ok'; await page.waitForSelector('[aria-label="发布招募"]', { hidden: true });
  await waitText('我的新招募');
  await heldFeed(); holdFeed = false;
  await waitText('我的新招募'); await waitText('伙伴招募');
  assert.equal(await page.$eval('main h3', node => node.textContent), '我的新招募');
  assert.equal(await page.$$eval('main button', buttons => buttons.find(button => button.textContent.trim() === '我的招募').disabled), true);
  await page.setViewport({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.waitForFunction(() => !document.querySelector('main img[src$="missing-avatar.png"]'));
  assert.equal(await page.$$eval('main img[src=""]', nodes => nodes.length), 0);
  await page.screenshot({ path: '/tmp/doai-community-mobile.png', fullPage: true });
  await page.setViewport({ width: 1440, height: 960 });
  feedFails = true;
  await routeInApp('detail/recruit/post-1'); await waitText('本次申请暂不合适');
  await routeInApp('square'); await waitText('招募帖暂时无法加载');
  assert.ok((await page.$eval('main', node => node.textContent)).includes('我的新招募'));
  await click('我的新招募'); await waitText('我的新招募');
  await page.waitForFunction(() => document.querySelector('main h1')?.textContent === '我的新招募' && scrollY < 2);
  await go('maker/tracks');
  await page.waitForFunction(() => { const node = document.querySelector('#maker-tracks'); const top = node?.getBoundingClientRect().top; return top >= 0 && top < 160; });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await click('FDE 赛道 · 赛题与赛制');
  await page.waitForFunction(() => { const top = document.querySelector('#maker-tracks')?.getBoundingClientRect().top; return top >= 0 && top < 160; });
  assert.deepEqual(errors, []);
  console.log('PASS: publishing validates tags, keeps failed drafts, saves stage/skills, blocks duplicates and merges late feed reads without losing posts');
  console.log('PASS: route changes reset detail scroll while section links and same-route anchor reselects still work');
} catch (error) {
  await page.screenshot({ path: '/tmp/doai-community-failure.png', fullPage: true }); console.error(await page.$eval('body', node => node.textContent)); throw error;
} finally { await browser.close(); }
