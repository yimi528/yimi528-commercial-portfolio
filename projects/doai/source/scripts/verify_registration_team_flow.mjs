import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

// Creates and destroys a dedicated MySQL container. No .env URL is used for queries.
const backend = resolve(process.env.DOAI_BACKEND_DIR || '../atomesh-network-fix/atomhub-api');
const container = `doai-social-qa-${randomBytes(5).toString('hex')}`;
const password = randomBytes(24).toString('hex');
let created = false, db, authDb, browser, apiApp, webServer;
const originalAdmins = process.env.DOAI_ADMIN_USER_IDS;
const run = (program, args, input = '', allowFailure = false, extraEnv = {}) => new Promise((resolve, reject) => {
  const child = spawn(program, args, { cwd: backend, env: { ...process.env, ...extraEnv }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  child.on('error', reject);
  child.on('close', code => code === 0 || allowFailure ? resolve({ code, stdout, stderr }) : reject(new Error(`${program} failed: ${stderr.replaceAll(password, '[test-password]')}`)));
  child.stdin.end(input);
});
// The image runs a temporary socket-only server during initialization. TCP becomes
// available only after that server has stopped and the final server is ready.
const mysql = (sql, allowFailure = false) => run('docker', ['exec', '-i', '-e', `MYSQL_PWD=${password}`, container, 'mysql', '--protocol=TCP', '-h127.0.0.1', '-uroot', '--default-character-set=utf8mb4', '--batch', '--skip-column-names'], sql, allowFailure);
const atTime = async (instant, work) => {
  const originalNow = Date.now; Date.now = () => Date.parse(instant);
  try { return await work(); } finally { Date.now = originalNow; }
};
const expectStatus = async (promise, expected) => {
  try { await promise; assert.fail(`Expected HTTP ${expected}`); }
  catch (error) { assert.equal(error.getStatus?.(), expected, `Expected ${expected}, received ${error.message}`); }
};
try {
  const schema = await run(join(backend, 'node_modules/.bin/prisma'), ['migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], '', false, { DATABASE_URL: 'mysql://unused:unused@127.0.0.1:1/unused' });
  const usersDDL = schema.stdout.match(/CREATE TABLE `users` \([\s\S]*?\n\)[^;]+;/)?.[0];
  assert.ok(usersDDL, 'Generated users schema is required for the isolated database');
  const authSchema = await run(join(backend, 'node_modules/.bin/prisma'), ['migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/auth-schema.prisma', '--script'], '', false, { AUTH_DATABASE_URL: 'mysql://unused:unused@127.0.0.1:1/unused' });
  const authUsersDDL = authSchema.stdout.match(/CREATE TABLE `users` \([\s\S]*?\n\)[^;]+;/)?.[0];
  assert.ok(authUsersDDL, 'Generated authority users schema is required for the isolated database');
  await run('docker', ['run', '--pull=never', '-d', '--rm', '--name', container, '--memory', '1g', '--cpus', '1', '--tmpfs', '/var/lib/mysql:rw,size=768m', '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-e', 'MYSQL_ROOT_HOST=%', '-p', '127.0.0.1::3306', 'mysql:8.0']);
  created = true;
  console.log('Started a dedicated temporary MySQL container; production URLs are not used.');
  const deadline = Date.now() + 90000;
  while (true) {
    const ping = await mysql('SELECT 1;', true);
    if (ping.code === 0) break;
    if (Date.now() > deadline) throw new Error('Temporary MySQL did not become ready');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await mysql(`CREATE DATABASE doai_social_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE doai_social_qa; ${usersDDL}`);
  await mysql(`CREATE DATABASE doai_auth_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE doai_auth_qa; ${authUsersDDL}`);
  for (const file of ['20261023_add_doai.sql', '20261026_add_doai_community_cms.sql', '20261026_add_doai_team_invitations.sql', '20261026_add_doai_team_invitations.sql', '20261027_add_doai_admin_accounts.sql', '20261027_add_doai_admin_accounts.sql', '20261027_add_doai_forum_bookmarks.sql', '20261027_add_doai_forum_bookmarks.sql', '20261027_add_doai_registration_requests.sql', '20261027_add_doai_registration_requests.sql', '20261030_add_doai_registration_channels.sql', '20261030_add_doai_registration_channels.sql']) {
    await mysql(`USE doai_social_qa;\n${await readFile(join(backend, 'prisma/migrations/sql', file), 'utf8')}`);
  }
  const shape = await mysql("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA='doai_social_qa' AND TABLE_NAME='doai_team_invitations'; SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='doai_social_qa' AND TABLE_NAME='doai_team_invitations' AND COLUMN_COMMENT<>'';");
  assert.match(shape.stdout, /InnoDB\s+utf8mb4_unicode_ci\s+10/);
  const bookmarkShape = await mysql("SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA='doai_social_qa' AND TABLE_NAME='doai_forum_bookmarks'; SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='doai_social_qa' AND TABLE_NAME='doai_forum_bookmarks' AND COLUMN_COMMENT<>'';");
  assert.match(bookmarkShape.stdout, /InnoDB\s+utf8mb4_unicode_ci\s+4/);
  const require = createRequire(join(backend, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const { PrismaClient: AuthPrismaClient } = require('.prisma/client-auth');
  const { DoaiService } = require(join(backend, 'dist/src/modules/doai.service.js'));
  const port = (await run('docker', ['port', container, '3306/tcp'])).stdout.trim().split(':').at(-1);
  assert.match(port, /^\d+$/);
  db = new PrismaClient({ datasources: { db: { url: `mysql://root:${password}@127.0.0.1:${port}/doai_social_qa` } } });
  authDb = new AuthPrismaClient({ datasources: { db: { url: `mysql://root:${password}@127.0.0.1:${port}/doai_auth_qa` } } });
  const service = new DoaiService(db, authDb);
  const owner = { id: randomUUID(), name: 'Integration owner' }, peer = { id: randomUUID(), name: 'Confirmed peer' };
  for (const [index, actor] of [owner, peer].entries()) {
    await db.user.create({ data: { id: actor.id, userIdUuid: actor.id, name: actor.name, signature: '', city: '上海' } });
    await authDb.user.create({ data: { userId: actor.id, name: actor.name, phone: `1380000000${index}` } });
  }
  process.env.DOAI_ADMIN_USER_IDS = '';
  const { Test } = require('@nestjs/testing');
  const { APP_GUARD } = require('@nestjs/core');
  const { DoaiController } = require(join(backend, 'dist/src/modules/doai.module.js'));
  const { AuthGuard } = require(join(backend, 'dist/src/common/auth.guard.js'));
  const { AtomAuthService } = require(join(backend, 'dist/src/common/atom-auth.service.js'));
  const { TaskService } = require(join(backend, 'dist/src/modules/task.service.js'));
  const { AllExceptionsFilter } = require(join(backend, 'dist/src/common/http-exception.filter.js'));
  const identities = new Map([['local-owner-token', owner], ['local-peer-token', peer]]);
  const module = await Test.createTestingModule({ controllers: [DoaiController], providers: [
    { provide: DoaiService, useValue: service }, { provide: APP_GUARD, useClass: AuthGuard },
    { provide: AtomAuthService, useValue: { verify: async token => ({ valid: identities.has(token), hubUserId: identities.get(token)?.id }) } },
    { provide: TaskService, useValue: { maybeRecordLoginStreak: async () => {} } },
  ] }).compile();
  apiApp = module.createNestApplication(); apiApp.setGlobalPrefix('api'); apiApp.useGlobalFilters(new AllExceptionsFilter());
  await apiApp.listen(0, '127.0.0.1'); const apiOrigin = await apiApp.getUrl();
  const frontRequire = createRequire(resolve('package.json'));
  const express = frontRequire('express'), puppeteer = frontRequire('puppeteer-core');
  const web = express(); web.use(express.json());
  const state = { loseNext: false, posts: 0 };
  web.use('/doai/api', async (req, res) => {
    try {
      const token = String(req.headers.authorization || '').replace(/^Bearer /, ''), actor = identities.get(token);
      if (req.path === '/user/me') return actor ? res.json({ ...actor, city: '上海', skills: [], bio: '', avatarUrl: '', maskedPhone: '138****0000' }) : res.status(401).json({ message: 'Sign in' });
      const response = await fetch(`${apiOrigin}/api${req.url}`, { method: req.method, headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}), ...(req.headers['x-doai-actor'] ? { 'X-DOAI-Actor': req.headers['x-doai-actor'] } : {}) }, ...(['GET','HEAD'].includes(req.method) ? {} : { body: JSON.stringify(req.body) }) });
      const body = await response.text();
      if (req.path === '/doai/registrations' && req.method === 'POST') console.log('Registration HTTP status:', response.status, response.ok ? 'confirmed' : body);
      if (req.path === '/doai/registrations' && req.method === 'POST') {
        state.posts++;
        if (response.ok && state.loseNext) { state.loseNext = false; res.status(503).json({message:'Test response lost after commit'}); return; }
      }
      res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(body);
    } catch (error) { res.status(500).json({ message: String(error) }); }
  });
  web.use('/doai', express.static(resolve('dist'))); web.get('/doai/*', (_req,res) => res.sendFile(resolve('dist/index.html')));
  webServer = await new Promise(resolve => { const server = web.listen(0, '127.0.0.1', () => resolve(server)); });
  const origin = `http://127.0.0.1:${webServer.address().port}`;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.createBrowserContext(), page = await context.newPage(), pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.evaluateOnNewDocument(() => { localStorage.setItem('user_token','local-owner-token'); localStorage.setItem('doai_lang','zh'); });
  await page.setRequestInterception(true); page.on('request', req => new URL(req.url()).origin === origin ? req.continue() : req.abort());
  const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
  const click = value => page.evaluate(value => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes(value)); if (!button || button.disabled) throw new Error(`Button unavailable: ${value}`); button.click(); }, value);
  async function fill(project) {
    await page.goto(`${origin}/doai/register/creator`, { waitUntil:'networkidle0' }); await page.waitForSelector('#registration-channel'); await page.select('#registration-channel','public');
    await page.waitForFunction(() => document.querySelector('#registration-account-phone')?.value.includes('138'));
    await page.select('#entry-direction','ai-app'); await page.type('#registration-email','owner@example.com'); await page.type('#registration-bio','Team integration background');
    await click('下一步：参赛模式'); await page.waitForSelector('#registration-team-name');
    const readOnly = await page.$eval('#registration-team-name', input => input.readOnly);
    if (!readOnly) await page.type('#registration-team-name','Shared integration team');
    await click('下一步：项目与作品'); await page.type('input[placeholder*="NeuroFlow"]',project); await page.type('textarea','Private project summary');
  }
  await fill('Recovered project'); state.loseNext = true; await click('立即提交申报'); await text('Test response lost after commit');
  assert.equal(state.posts,1); assert.equal(await db.doaiTeam.count(),1); assert.equal(await db.doaiRegistration.count(),1);
  await fill('Recovered project'); await click('立即提交申报'); await text('已确认已有报名');
  assert.equal(state.posts,1); assert.equal(await db.doaiRegistration.count(),1); assert.equal(await db.doaiTicket.count(),1); assert.equal(await db.doaiNotification.count(),1);
  const saved = (await service.myTeam(owner)).team; assert.ok(saved); const first = (await service.registrations(owner)).registrations[0]; assert.equal(first.teamId,saved.id);
  await page.goto(`${origin}/doai/dashboard/team`, { waitUntil:'networkidle0' }); await text('使用本战队报名'); await click('使用本战队报名'); await page.waitForFunction(() => location.pathname.endsWith('/register/creator'));
  await fill('Recovered project'); await click('立即提交申报'); await text('已确认已有报名'); assert.equal(await db.doaiRegistration.count(),1);
  console.log('PASS: real browser + API + MySQL: registration creates My Team; lost response/reload recovers through GET; fresh-key replay deduplicates; My Team opens the shared entry flow');
  await db.doaiTeamMember.create({ data: { id:randomUUID(),teamId:saved.id,userId:peer.id,eventId:'doai-2026',roleTitle:'研发',isLeader:false } });
  await fill('Roster update project'); await db.doaiTeamMember.deleteMany({ where:{userId:peer.id} });
  await click('立即提交申报'); await text('队名或成员已变化'); assert.equal(await page.$eval('input[placeholder*="NeuroFlow"]',n=>n.value),'Roster update project');
  await click('返回并重新加载战队'); await page.waitForSelector('#registration-team-name'); await click('下一步：项目与作品'); await click('立即提交申报'); await text('赛事申报提交成功');
  assert.equal(await db.doaiRegistration.count(),2); assert.equal(await db.doaiTeam.count(),1);
  console.log('PASS: a roster change rejects the stale snapshot with zero partial registration; reload keeps the project draft and permits a confirmed retry');
  const base = {channel:'public',requestKey:randomUUID(),expectedUserId:owner.id,type:'team',teamName:saved.name,track:'creator',projectName:'Forged',projectSummary:'Private',videoUrl:'',docUrl:'',teamBinding:{kind:'existing',id:saved.id},members:[{id:owner.id,name:owner.name,phone:'',roleTitle:'队长',isLeader:true}]};
  const request = async (body,token,actorId) => fetch(`${apiOrigin}/api/doai/registrations`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-DOAI-Actor':actorId},body:JSON.stringify(body)});
  const forged = await request({...base,members:[...base.members,{id:peer.id,name:peer.name,phone:'',roleTitle:'研发',isLeader:false}]},'local-owner-token',owner.id); assert.equal(forged.status,409);
  const cross = await request(base,'local-peer-token',owner.id);assert.equal(cross.status,409);
  await db.doaiTeamMember.create({data:{id:randomUUID(),teamId:saved.id,userId:peer.id,eventId:'doai-2026',roleTitle:'研发',isLeader:false}});
  const nonLeader=await request({...base,expectedUserId:peer.id},'local-peer-token',peer.id);assert.equal(nonLeader.status,403);
  await db.doaiTeamMember.deleteMany({where:{userId:peer.id}});
  console.log('PASS: HTTP rejects injected members, forged actor headers and non-leader submissions');
  const newDraft={channel:'public',...base,requestKey:randomUUID(),expectedUserId:peer.id,teamName:'Concurrent team',projectName:'Concurrent project',teamBinding:{kind:'create'},members:[{id:peer.id,name:peer.name,phone:'',roleTitle:'队长',isLeader:true}]};
  const before = await db.doaiRegistration.count(); const originalNotice=service.notice;
  service.notice=async()=>{throw new Error('Injected notification failure');};
  try { await assert.rejects(service.register(newDraft,peer),/Injected notification/); } finally {service.notice=originalNotice;}
  assert.equal(await db.doaiTeamMember.count({where:{userId:peer.id}}),0);assert.equal(await db.doaiTeam.count(),1);assert.equal(await db.doaiRegistration.count(),before);
  const outcomes=await Promise.all([service.register(newDraft,peer),service.register({...newDraft,requestKey:randomUUID()},peer)]);
  assert.equal(outcomes[0].registration.id,outcomes[1].registration.id);assert.equal(await db.doaiTeam.count(),2);assert.equal(await db.doaiRegistration.count(),before+1);
  assert.equal((await service.createTeam({name:newDraft.teamName,track:'creator'},peer)).team?.id,outcomes[0].registration.teamId);
  assert.equal(await db.doaiRecruitment.count(),0);assert.deepEqual(pageErrors,[]);
  await page.setViewport({width:390,height:844});await fill('Mobile project');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/doai-team-registration-mobile.png',fullPage:true});
  console.log('PASS: notification failure rolls back team/member/request/entry/pass together; concurrent retries create one team/entry; My Team reuses it; private entries never become public recruitment; mobile layout fits');
} catch (error) {
  if (browser) { const pages = await browser.pages(); const page = pages.at(-1); if (page) { await page.screenshot({path:'/tmp/doai-team-registration-debug.png',fullPage:true}); console.error('Local QA page:', (await page.$eval('main', n=>n.innerText)).slice(-2200)); } }
  throw error;
} finally {
  await browser?.close(); await apiApp?.close(); if (webServer) await new Promise(resolve => webServer.close(resolve));
  if (originalAdmins === undefined) delete process.env.DOAI_ADMIN_USER_IDS; else process.env.DOAI_ADMIN_USER_IDS=originalAdmins;
  await Promise.allSettled([db?.$disconnect(),authDb?.$disconnect()]);
  if (created) await run('docker',['rm','-f',container]);
}
