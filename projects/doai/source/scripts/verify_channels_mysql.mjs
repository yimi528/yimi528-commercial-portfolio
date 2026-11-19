import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

// Creates and destroys a dedicated MySQL container. No .env URL is used for queries.
const backend = resolve(process.env.DOAI_BACKEND_DIR || '../atomesh-network-fix/atomhub-api');
const container = `doai-channels-qa-${randomBytes(5).toString('hex')}`;
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
  await run('docker', ['run', '--pull=never', '-d', '--rm', '--name', container, '--memory', '1g', '--cpus', '1', '--tmpfs', '/var/lib/mysql:rw,size=768m', '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-e', 'MYSQL_ROOT_HOST=%', '-p', '127.0.0.1::3306', 'mysql:8.0']);
  created = true;
  console.log('Started isolated MySQL channel verification.');
  const deadline = Date.now() + 90000;
  while ((await mysql('SELECT 1;', true)).code !== 0) { if (Date.now() > deadline) throw new Error('Temporary MySQL startup timeout'); await new Promise(resolve => setTimeout(resolve, 500)); }
  await mysql(`CREATE DATABASE doai_channels_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE doai_channels_qa; ${usersDDL}`);
  for (const file of ['20261023_add_doai.sql', '20261026_add_doai_community_cms.sql', '20261026_add_doai_team_invitations.sql', '20261027_add_doai_admin_accounts.sql', '20261027_add_doai_forum_bookmarks.sql', '20261027_add_doai_registration_requests.sql']) await mysql(`USE doai_channels_qa;\n${await readFile(join(backend, 'prisma/migrations/sql', file), 'utf8')}`);
  await mysql("USE doai_channels_qa; INSERT INTO doai_registrations (id,owner_user_id,maker_id,project_name,team_name,track,details) VALUES ('historical','old-owner','OLD-MAKER','Historical','Old team','creator','{}'); INSERT INTO doai_admin_accounts (user_id,updated_by) VALUES ('existing-admin','existing-admin');");
  const migration = await readFile(join(backend, 'prisma/migrations/sql/20261030_add_doai_registration_channels.sql'), 'utf8');
  await mysql(`USE doai_channels_qa;\n${migration}`); await mysql(`USE doai_channels_qa;\n${migration}`);
  const require = createRequire(join(backend, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const { DoaiService } = require(join(backend, 'dist/src/modules/doai.service.js'));
  const port = (await run('docker', ['port', container, '3306/tcp'])).stdout.trim().split(':').at(-1);
  assert.match(port, /^\d+$/);
  db = new PrismaClient({ datasources: { db: { url: `mysql://root:${password}@127.0.0.1:${port}/doai_channels_qa` } } });
  const service = new DoaiService(db), root = { id: randomUUID() };
  process.env.DOAI_ADMIN_USER_IDS = root.id;
  const makeUser = async name => { const actor = { id: randomUUID() }; await db.user.create({ data: { id: actor.id, name, phone: `138${String(Math.floor(Math.random()*1e8)).padStart(8,'0')}`, signature: '' } }); return actor; };
  await db.user.create({ data: { id: root.id, name: 'Root', signature: '' } });
  assert.equal((await db.doaiRegistration.findUnique({ where: { id: 'historical' } })).channel, null);
  assert.equal((await db.doaiAdminAccount.findUnique({ where: { userId: 'existing-admin' } })).role, 'super_admin');
  assert.equal(await service.isAdmin('existing-admin'), true);
  const records = [];
  for (const channel of ['public','atom','dobe','overseas']) {
    const owner = await makeUser(`${channel} attendee`), operator = await makeUser(`${channel} operator`);
    await service.grantAdmin({ userId: operator.id, role: 'channel_operator', channel }, root);
    const requestKey = `channel-${randomUUID()}`;
    const draft = { channel, requestKey, expectedUserId: owner.id, type:'individual', track:'creator', projectName:`${channel} private project`, teamName:'QA team', projectSummary:'Isolated QA', members:[{name:'Owner',isLeader:true}] };
    const entry = await service.register(draft, owner);
    const retry = await service.register(draft, owner); assert.equal(retry.registration.id, entry.registration.id); assert.equal(retry.created, false);
    await expectStatus(service.register({...draft, channel:channel==='atom'?'dobe':'atom'},owner),409);
    const media = { type:'guest', channel, bookingKey:'attendance:media:seat-open', passType:'pass-media', organization:'QA media', title:`${channel} media` };
    const ticket = (await service.issueTicket(media,owner)).ticket;
    const ordinary = (await service.issueTicket({ type:'guest',channel,bookingKey:'attendance:pass-day2',passType:'pass-day2',title:`${channel} public attendee` },owner)).ticket;
    assert.equal(ticket.status,'pending_review');assert.equal(ordinary.status,'claimed');assert.equal(ticket.channel,channel);
    await expectStatus(service.issueTicket({...media,channel:channel==='atom'?'dobe':'atom'},owner),409);
    records.push({channel,owner,operator,entry:entry.registration,ticket,ordinary});
  }
  for (const own of records) {
    assert.equal((await service.me(own.operator)).operatorChannel,own.channel);
    const registrations=(await service.registrations(own.operator)).registrations;
    assert.deepEqual(registrations.map(row=>row.id),[own.entry.id]);
    const attendance=(await service.attendanceApplications(own.operator)).applications;
    assert.equal(attendance.length,2);assert.ok(attendance.every(row=>row.channel===own.channel));
    for (const other of records.filter(row=>row!==own)) {
      await expectStatus(service.registrationDetail(other.entry.id,own.operator),404);
      await expectStatus(service.review(other.entry.id,{status:'shortlisted'},own.operator),404);
      await expectStatus(service.reviewAttendance({id:other.ticket.id,status:'claimed'},own.operator),404);
    }
    await expectStatus(service.registrationDetail('historical',own.operator),404);
    assert.equal((await service.review(own.entry.id,{status:'shortlisted'},own.operator)).registration.status,'shortlisted');
    assert.equal((await service.reviewAttendance({id:own.ticket.id,status:'claimed'},own.operator)).ticket.status,'claimed');
    await expectStatus(service.grantAdmin({userId:own.owner.id,role:'super_admin'},own.operator),403);
    await expectStatus(service.saveSiteConfig({},own.operator),403);await expectStatus(service.broadcast({},own.operator),403);
  }
  assert.equal((await service.registrations(root)).registrations.length,5);
  assert.equal((await service.attendanceApplications(root)).applications.length,8);
  const first=records[0];await service.grantAdmin({userId:first.operator.id,role:'channel_operator',channel:'atom'},root);
  assert.deepEqual((await service.registrations(first.operator)).registrations.map(row=>row.id),[records[1].entry.id]);
  await expectStatus(service.review(first.entry.id,{status:'rejected'},first.operator),404);
  await service.revokeAdmin(first.operator.id,root);await expectStatus(service.attendanceApplications(first.operator),403);
  assert.equal((await service.registrations(first.operator)).registrations.length,0);
  for(const channel of [undefined,null,'all','']) {
    await expectStatus(service.register({channel},records[0].owner),400);
    await expectStatus(service.issueTicket({type:'guest',bookingKey:'attendance:pass-day2',passType:'pass-day2',title:'QA',channel},records[0].owner),400);
  }
  console.log('PASS: repeatable migration, historical nulls, four channel lists/details/reviews, both attendance types, duplicate preservation, root access, reassignment/revocation and privilege isolation against real MySQL.');
} finally {
  await db?.$disconnect();
  if(originalAdmins===undefined)delete process.env.DOAI_ADMIN_USER_IDS;else process.env.DOAI_ADMIN_USER_IDS=originalAdmins;
  if(created)await run('docker',['rm','-f',container],'',true);
}
