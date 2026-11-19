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
  const service = new DoaiService(db);
  const codeUsers = Array.from({ length: 7 }, () => ({ id: randomUUID() }));
  await db.user.createMany({ data: codeUsers.map(user => ({ id: user.id, name: 'Invite code QA', signature: '' })) });
  const codeTeam = (await service.createTeam({ name: 'Code capacity QA', track: 'creator' }, codeUsers[0])).team;
  const code = codeTeam.inviteCode;
  assert.ok(!(await service.teams()).teams.some(team => team?.inviteCode));
  await expectStatus(service.joinTeam({ inviteCode: code }), 401);
  await expectStatus(service.joinTeam({ inviteCode: 'invalid' }, codeUsers[1]), 400);
  // Independent users racing for the last four slots must not overfill the team.
  const joins = await Promise.allSettled(codeUsers.slice(1).map(user => service.joinTeam({ inviteCode: ` ${code.toUpperCase()} ` }, user)));
  const savedTeam = (await new DoaiService(db).myTeam(codeUsers[0])).team;
  assert.equal(savedTeam.members.length, 5);
  assert.equal(joins.filter(result => result.status === 'fulfilled').length, 4);
  for (const result of joins.filter(result => result.status === 'rejected')) assert.equal(result.reason.getStatus?.(), 409);
  const joined = codeUsers.find(user => user.id !== codeUsers[0].id && savedTeam.members.some(member => member.id === user.id));
  const beforeCodeNotices = await db.doaiNotification.count({ where: { toUserId: codeUsers[0].id } });
  await Promise.all([service.joinTeam({ inviteCode: code }, joined), service.joinTeam({ inviteCode: code }, joined)]);
  assert.equal(await db.doaiTeamMember.count({ where: { teamId: codeTeam.id } }), 5);
  assert.equal(await db.doaiNotification.count({ where: { toUserId: codeUsers[0].id } }), beforeCodeNotices);
  assert.deepEqual((await new DoaiService(db).myTeam(joined)).team.members, savedTeam.members);
  await service.editTeam(codeTeam.id, 'leave', {}, joined);
  assert.equal((await service.myTeam(codeUsers[0])).team.members.length, 4);
  await service.editTeam(codeTeam.id, 'leave', {}, codeUsers[0]);
  await expectStatus(service.joinTeam({ inviteCode: code }, joined), 404);
  console.log('PASS: real MySQL invite-code join persists for both accounts, concurrent capacity stays at five, retry adds no membership/notification, leave syncs and disband invalidates code');
} finally {
  if (originalAdmins === undefined) delete process.env.DOAI_ADMIN_USER_IDS;
  else process.env.DOAI_ADMIN_USER_IDS = originalAdmins;
  const closed = await Promise.allSettled([db?.$disconnect(), authDb?.$disconnect()]);
  if (created) await run('docker', ['rm', '-f', container]);
  const closeFailure = closed.find(result => result.status === 'rejected');
  if (closeFailure) throw closeFailure.reason;
}
