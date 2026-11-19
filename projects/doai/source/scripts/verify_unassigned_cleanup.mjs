import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

// This test creates its own disposable database; it never reads a .env or uses a business DB.
const container = `doai-cleanup-qa-${randomBytes(5).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const backend = resolve(process.env.DOAI_BACKEND_DIR || '../atomesh-network-fix/atomhub-api');
let created = false;
const run = (args, input = '', allowFailure = false) => new Promise((resolve, reject) => {
  const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  child.on('error', reject);
  child.on('close', code => code === 0 || allowFailure ? resolve({ code, stdout }) : reject(new Error(stderr.replaceAll(password, '[test-password]'))));
  child.stdin.end(input);
});
const mysql = (sql, allowFailure = false) => run(['exec', '-i', '-e', `MYSQL_PWD=${password}`, container, 'mysql', '--protocol=TCP', '-h127.0.0.1', '-uroot', '--batch', '--skip-column-names'], sql, allowFailure);
const cleanup = await readFile(new URL('../backend/20261030_delete_unassigned_registrations.sql', import.meta.url), 'utf8');
const base = await readFile(`${backend}/prisma/migrations/sql/20261023_add_doai.sql`, 'utf8');
const tables = ['doai_registrations', 'doai_tickets', 'doai_checkins'].map(table => {
  const statement = base.match(new RegExp(`CREATE TABLE IF NOT EXISTS \x60${table}\x60 \\([\\s\\S]*?;`))?.[0];
  assert.ok(statement, `Missing real schema for ${table}`);
  return statement;
}).join('\n');
try {
  await run(['run', '--pull=never', '--rm', '-d', '--name', container, '--memory', '1g', '--cpus', '1', '--tmpfs', '/var/lib/mysql:rw,size=768m', '-e', `MYSQL_ROOT_PASSWORD=${password}`, 'mysql:8.0']);
  created = true;
  console.log('Started isolated MySQL cleanup verification.');
  const deadline = Date.now() + 90000;
  while ((await mysql('SELECT 1;', true)).code !== 0) {
    if (Date.now() > deadline) throw new Error('Temporary MySQL startup timeout');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await mysql(`CREATE DATABASE cleanup_qa; USE cleanup_qa; ${tables}
    ALTER TABLE doai_registrations ADD COLUMN channel VARCHAR(24) NULL;
    ALTER TABLE doai_tickets ADD COLUMN channel VARCHAR(24) NULL;
    ${await readFile(new URL('../backend/20261027_add_doai_registration_requests.sql', import.meta.url), 'utf8')}`);
  const sqlCell = value => value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;
  const cases = [[null, true], ['', true], ['  ', true], ['unknown', true], ['DOBE', true], ['dobe ', true], ...['public', 'atom', 'dobe', 'overseas'].map(value => [value, false])];
  const inserts = [];
  for (const [index, [channel]] of cases.entries()) {
    inserts.push(`INSERT INTO doai_registrations (id, owner_user_id, maker_id, project_name, team_name, track, details, channel) VALUES ('r${index}','owner','M${index}','Project','Team','creator','{}',${sqlCell(channel)});`);
    inserts.push(`INSERT INTO doai_registration_requests (user_id, request_key, payload_hash, registration_id) VALUES ('owner','request${index}','hash','r${index}');`);
    for (const type of ['maker', 'guest']) {
      const id = `${type}${index}`, key = type === 'maker' ? `registration:r${index}` : `attendance:${index}`;
      inserts.push(`INSERT INTO doai_tickets (id,owner_user_id,booking_key,qr_code,type,holder_name,holder_phone,details,channel) VALUES ('${id}','owner','${key}','QR-${id}','${type}','QA','','{}',${type === 'maker' ? 'NULL' : sqlCell(channel)});`);
      inserts.push(`INSERT INTO doai_checkins (id,ticket_id,operator_id,gate) VALUES ('c-${id}','${id}','staff','Main');`);
    }
  }
  inserts.push(`INSERT INTO doai_registrations (id,event_id,owner_user_id,maker_id,project_name,team_name,track,details) VALUES ('other','other-event','owner','OTHER','Other','Team','creator','{}');`);
  for (const [id, event, key, type] of [['forum', 'doai-2026', 'forum:one', 'forum'], ['standalone', 'doai-2026', 'independent', 'maker'], ['other', 'other-event', 'attendance:other', 'guest']]) {
    inserts.push(`INSERT INTO doai_tickets (id,event_id,owner_user_id,booking_key,qr_code,type,holder_name,holder_phone,details) VALUES ('${id}','${event}','owner','${key}','QR-${id}','${type}','QA','','{}');`);
    inserts.push(`INSERT INTO doai_checkins (id,ticket_id,operator_id,gate) VALUES ('c-${id}','${id}','staff','Main');`);
  }
  await mysql(`USE cleanup_qa; ${inserts.join('\n')}`);
  const first = await mysql(`USE cleanup_qa; ${cleanup}`);
  assert.equal(first.stdout.trim(), '6\t12\t6\t12');
  const readIds = async table => (await mysql(`USE cleanup_qa; SELECT id FROM ${table} ORDER BY id;`)).stdout.trim().split('\n');
  assert.deepEqual(await readIds('doai_registrations'), ['other', 'r6', 'r7', 'r8', 'r9']);
  assert.deepEqual(await readIds('doai_tickets'), ['forum', 'guest6', 'guest7', 'guest8', 'guest9', 'maker6', 'maker7', 'maker8', 'maker9', 'other', 'standalone']);
  assert.equal((await mysql('USE cleanup_qa; SELECT COUNT(*) FROM doai_checkins;')).stdout.trim(), '11');
  assert.equal((await mysql('USE cleanup_qa; SELECT COUNT(*) FROM doai_registration_requests;')).stdout.trim(), '4');
  assert.equal((await mysql(`USE cleanup_qa; ${cleanup}`)).stdout.trim(), '0\t0\t0\t0');
  console.log('PASS: null/blank/invalid channels and linked receipts, maker tickets and check-ins removed; all four channels, forum/independent tickets and other events preserved; repeat execution is a no-op.');
} finally {
  if (created) await run(['rm', '-f', container], '', true);
}
