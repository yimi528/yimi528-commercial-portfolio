/** 只读联通检查；完整业务权限由主站 doai.service.spec.ts 验证。 */
import assert from 'node:assert/strict';
const origin = process.env.DOAI_API_ORIGIN || 'http://127.0.0.1:3102';
const health = await fetch(`${origin}/api/doai/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).module, 'doai');
for (const path of ['registrations', 'tickets', 'cards', 'notifications']) {
  const response = await fetch(`${origin}/api/doai/${path}`);
  assert.equal(response.status, 401, `anonymous ${path}`);
}
if (process.env.DOAI_SESSION_TOKEN) {
  const headers = { Authorization: `Bearer ${process.env.DOAI_SESSION_TOKEN}` };
  const response = await fetch(`${origin}/api/doai/me`, { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
}
console.log('DOAI health and private endpoint isolation passed; no data was written');
