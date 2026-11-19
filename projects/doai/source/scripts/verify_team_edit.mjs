/** 使用真实主站测试会话读取本人战队，不再使用演示用户伪造身份。 */
import assert from 'node:assert/strict';
const origin = process.env.DOAI_API_ORIGIN || 'http://127.0.0.1:3102';
const token = process.env.DOAI_SESSION_TOKEN;
if (!token) throw new Error('请提供主站测试账号的 DOAI_SESSION_TOKEN');
const response = await fetch(`${origin}/api/doai/my-team`, { headers: { Authorization: `Bearer ${token}` } });
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.ok, true);
if (result.team) assert.ok(result.team.members.length >= 1 && result.team.members.length <= 5);
console.log('Authenticated team read passed; use atomhub-api doai.service.spec.ts for management permission checks');
