import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

// Creates and destroys a dedicated MySQL container. No .env URL is used for queries.
const backend = resolve(process.env.DOAI_BACKEND_DIR || '../atomesh-network-fix/atomhub-api');
const container = `doai-forums-qa-${randomBytes(5).toString('hex')}`;
const password = randomBytes(24).toString('hex');
let created = false, db, authDb;
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
  assert.ok(usersDDL);
  await run('docker', ['run', '--pull=never', '-d', '--rm', '--name', container, '--memory', '1g', '--cpus', '1', '--tmpfs', '/var/lib/mysql:rw,size=768m', '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-p', '127.0.0.1::3306', 'mysql:8.0']); created = true;
  const deadline = Date.now() + 90000;
  while ((await mysql('SELECT 1;', true)).code !== 0) { if (Date.now() > deadline) throw new Error('Temporary MySQL startup timeout'); await new Promise(resolve => setTimeout(resolve, 500)); }
  await mysql(`CREATE DATABASE doai_forums_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE doai_forums_qa; ${usersDDL}`);
  for (const file of ['20261023_add_doai.sql','20261026_add_doai_community_cms.sql','20261027_add_doai_admin_accounts.sql','20261027_add_doai_forum_bookmarks.sql','20261030_add_doai_registration_channels.sql']) await mysql(`USE doai_forums_qa;\n${await readFile(join(backend,'prisma/migrations/sql',file),'utf8')}`);
  const require = createRequire(join(backend,'package.json')), {PrismaClient} = require('@prisma/client'), {DoaiService} = require(join(backend,'dist/src/modules/doai.service.js'));
  const port = (await run('docker',['port',container,'3306/tcp'])).stdout.trim().split(':').at(-1);
  db = new PrismaClient({datasources:{db:{url:`mysql://root:${password}@127.0.0.1:${port}/doai_forums_qa`}}});
  const service = new DoaiService(db), root = {id:randomUUID()}; process.env.DOAI_ADMIN_USER_IDS = root.id;
  const actors = Array.from({length:6},()=>({id:randomUUID()}));
  for(const actor of [root,...actors]) await db.user.create({data:{id:actor.id,name:'Forum QA',signature:''}});
  const forum={title:'持久化场次',titleEn:'',track:'交流',venue:'测试厅',description:'测试场次介绍',startsAt:'2026-12-06T10:00:00+08:00',endsAt:'2026-12-06T12:00:00+08:00',publication:'draft',bookingEnabled:true,capacity:2,speakers:[]};
  assert.deepEqual((await service.publishedForums()).forums,[]);
  let saved=await service.saveForum({forum,expectedVersion:null},root), item=saved.forums[0];
  assert.match(item.id,/^session-/); assert.equal((await service.publishedForums()).forums.length,0);
  await expectStatus(service.managedForums(actors[0]),403);
  await expectStatus(service.issueTicket({type:'forum',bookingKey:`forum:${item.id}`,title:'伪造'},actors[0]),409);
  await expectStatus(service.saveForum({forum:{...item,publication:'published'},expectedVersion:null},root),409);
  saved=await service.saveForum({forum:{...item,publication:'published'},expectedVersion:saved.version},root); item=saved.forums[0];
  assert.equal((await new DoaiService(db).publishedForums()).forums[0].title,forum.title);
  const booking={type:'forum',bookingKey:`forum:${item.id}`,title:'伪造',venue:'伪造'};
  const results=await Promise.allSettled(actors.map(actor=>service.issueTicket(booking,actor)));
  const winners=results.flatMap((r,i)=>r.status==='fulfilled'?[{actor:actors[i],ticket:r.value.ticket}]:[]);
  assert.equal(winners.length,2,results.map(r=>r.status==='rejected'?r.reason.message:'ok').join(','));
  assert.equal(await db.doaiTicket.count({where:{bookingKey:booking.bookingKey,status:'claimed'}}),2);
  assert.equal(winners[0].ticket.title,forum.title); assert.equal(winners[0].ticket.venue,forum.venue);
  assert.equal((await service.forumStatistics()).forums[0].bookedCount,2);
  const repeat=await service.issueTicket(booking,winners[0].actor); assert.equal(repeat.ticket.id,winners[0].ticket.id);
  await expectStatus(service.saveForum({forum:{...item,capacity:1},expectedVersion:saved.version},root),409);
  await expectStatus(service.saveForum({forum:{...item,venue:'新地点'},expectedVersion:saved.version},root),409);
  saved=await service.saveForum({forum:{...item,bookingEnabled:false},expectedVersion:saved.version},root); item=saved.forums[0];
  await service.cancelTicket(winners[0].ticket.id,winners[0].actor);
  await expectStatus(service.issueTicket(booking,winners[0].actor),409);
  saved=await service.saveForum({forum:{...item,bookingEnabled:true},expectedVersion:saved.version},root); item=saved.forums[0];
  const rebook=await service.issueTicket(booking,winners[0].actor); assert.equal(rebook.ticket.id,winners[0].ticket.id);
  await service.setForumBookmark({id:item.id,saved:true,expectedUserId:actors[0].id},actors[0]);
  assert.equal((await service.forumBookmarks(actors[0])).bookmarks[0].id,item.id);
  saved=await service.saveForum({forum:{...item,publication:'draft'},expectedVersion:saved.version},root); item=saved.forums[0];
  assert.equal((await service.publishedForums()).forums.length,0);
  await service.cancelTicket(rebook.ticket.id,winners[0].actor);
  await expectStatus(service.saveForum({id:item.id,expectedVersion:saved.version},root,true),409);
  const overview=await service.managedForums(root); assert.equal(overview.forums[0].bookedCount,1);
  await service.cancelTicket(winners[1].ticket.id,winners[1].actor);
  await service.saveForum({id:item.id,expectedVersion:saved.version},root,true);
  assert.equal((await service.managedForums(root)).forums.length,0);
  console.log('PASS: real isolated MySQL persistence, drafts/publication, full-admin access, stale editor rejection, six concurrent requests for two seats, idempotent rebooking, authoritative tickets, pause/resume, unpublish, cancellation, bookmarks and draft deletion.');
} finally {
  if (originalAdmins === undefined) delete process.env.DOAI_ADMIN_USER_IDS; else process.env.DOAI_ADMIN_USER_IDS=originalAdmins;
  await db?.$disconnect();
  if(created) await run('docker',['rm','-f',container],'',true);
}
