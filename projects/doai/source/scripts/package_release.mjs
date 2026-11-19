import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.DOAI_BACKEND_DIR || join(root, '../atomesh-network-fix/atomhub-api'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = join(tmpdir(), `doai-release-${stamp}.tar.gz`);
const stage = await mkdtemp(join(tmpdir(), 'doai-release-stage-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const copy = async (source, path) => { await cp(source, join(stage, path), { recursive: true }); };
const files = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Release input must be a regular file or directory: ${path}`);
  }
  return result.sort();
};
try {
  const index = await readFile(join(root, 'dist/index.html'), 'utf8');
  const entryAssets = [...index.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match => match[1]);
  if (!entryAssets.length || entryAssets.some(path => !path.startsWith('/doai/assets/'))) throw new Error('Build the /doai/ candidate with BASE=/doai/ npm run build first');
  const local = JSON.parse(await readFile('/tmp/doai-local-release-audit.json', 'utf8'));
  const live = JSON.parse(await readFile('/tmp/doai-production-audit.json', 'utf8'));
  const validatedAssets = local.checks.find(check => check.id === 'current-frontend-build');
  if (local.totals.failed || JSON.stringify(validatedAssets?.expected?.assets) !== JSON.stringify(entryAssets)) throw new Error('Run npm run test:release against the current build before packaging');
  await files(join(root, 'dist')); // Reject indirect inputs before copying the public build.
  await copy(join(root, 'dist'), 'frontend');
  await copy(join(root, 'backend/doai-backend-fixes.patch'), 'backend/doai-backend-fixes.patch');
  await copy(join(backend, 'docs/doai-release.md'), 'backend/doai-release.md');
  const migrations = [
    '20261023_add_doai.sql', '20261026_add_doai_community_cms.sql', '20261026_add_doai_team_invitations.sql',
    '20261027_add_doai_admin_accounts.sql', '20261027_add_doai_forum_bookmarks.sql', '20261027_add_doai_registration_requests.sql',
    '20261030_add_doai_registration_channels.sql',
  ];
  for (const file of migrations) await copy(join(backend, 'prisma/migrations/sql', file), `backend/sql/${file}`);
  await copy('/tmp/doai-local-release-audit.json', 'checks/local-candidate-fixtures.json');
  await copy('/tmp/doai-production-audit.json', 'checks/production-before.json');
  const records = await Promise.all((await files(stage)).map(async path => { const bytes = await readFile(path); return { path: relative(stage, path), bytes: bytes.length, sha256: hash(bytes) }; }));
  const manifest = {
    schemaVersion: 1, createdAt: new Date().toISOString(), deploymentBase: '/doai/', entryAssets,
    productionTarget: live.target, productionBefore: { checkedAt: live.checkedAt, passed: live.totals.passed, failed: live.totals.failed },
    localCandidate: { checkedAt: local.checkedAt, apiMode: 'isolated fixtures', passed: local.totals.passed, failed: local.totals.failed },
    backendPatchBase: execFileSync('git', ['-C', backend, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    backendStartCommand: JSON.parse(await readFile(join(backend, 'package.json'), 'utf8')).scripts['start:prod'],
    migrationOrder: migrations.map(name => ({ path: `backend/sql/${name}`, target: 'business database only' })),
    deploymentOrder: ['Review backend patch against its base revision', 'Apply required additive SQL to the business database', 'Generate both Prisma clients and publish backend', 'Publish frontend directory at /doai/', 'Run the read-only production audit and private test-account acceptance'],
    limitations: ['This archive does not execute migrations or deploy services', 'Local browser gate uses isolated API fixtures; service persistence is verified separately', 'Production checks are anonymous and block every non-read request; real SMS, registration and WeChat card rendering remain operator acceptance steps'],
    files: records,
  };
  await writeFile(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const manifestPath = output.replace(/\.tar\.gz$/, '.manifest.json');
  await cp(join(stage, 'manifest.json'), manifestPath);
  execFileSync('tar', ['-czf', output, '-C', stage, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  const archived = execFileSync('tar', ['-tzf', output], { encoding: 'utf8' }).split('\n').filter(path => path && !path.endsWith('/')).map(path => path.replace(/^\.\//, '')).sort();
  const expected = [...records.map(record => record.path), 'manifest.json'].sort();
  if (JSON.stringify(archived) !== JSON.stringify(expected)) throw new Error('Archive inventory differs from its manifest');
  console.log(JSON.stringify({ archive: output, archiveSha256: hash(await readFile(output)), manifest: manifestPath, files: records.length, productionBefore: manifest.productionBefore }));
} finally { await rm(stage, { recursive: true, force: true }); }
