import assert from 'node:assert/strict';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { auditProduction } from './verify_prod_content.mjs';

// This is a local release-candidate check. The API fixtures never connect to
// production; the identical auditor is run separately against the live site.
const app = express();
let writes = 0;
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { writes++; return res.sendStatus(405); }
  next();
});
app.get('/doai/api/user/me', (_req, res) => res.status(401).json({ message: 'Sign in' }));
app.use('/doai/api/doai', (req, res) => {
  const path = req.path;
  if (path === '/health') return res.json({ ok: true, module: 'doai' });
  if (path === '/forum-stats') return res.json({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) });
  if (path === '/site-config') return res.json({ ok: true, config: null, updatedAt: null });
  if (path === '/wx-articles') return res.json({ articles: [] });
  for (const name of ['recruitments', 'talents', 'users', 'teams']) if (path === `/${name}`) return res.json({ ok: true, [name]: [] });
  return res.status(401).json({ message: 'Sign in' });
});
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use('/doai', express.static(dist));
app.get('/doai/*', (_req, res) => res.sendFile(`${dist}index.html`));
const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
try {
  const site = `http://127.0.0.1:${server.address().port}/doai/`;
  const report = await auditProduction({ site, output: '/tmp/doai-local-release-audit.json' });
  assert.equal(writes, 0, 'Release checks must not reach any mutation endpoint');
  assert.equal(report.totals.failed, 0, JSON.stringify(report.checks.filter(check => !check.pass), null, 2));
  console.log('PASS: current /doai/ build passes the same read-only release gate with isolated API fixtures');
} finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
