import test from 'node:test';
import assert from 'node:assert/strict';
import { createDoaiProxy, restoreApiPath, isAllowedApiPath } from '../server.js';

async function setup(t, fetchImpl) {
  const app = createDoaiProxy({ upstream: 'https://upstream.test', fetchImpl });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}
test('shared auth login forwards data and returns a host-only HttpOnly session cookie', async t => {
  const request = await setup(t, async (url, options) => {
    assert.equal(String(url), 'https://upstream.test/api/auth/login');
    assert.equal(options.body, JSON.stringify({ phone: '13800000000', code: '123456' }));
    return new Response(JSON.stringify({ token: 'shared-token' }), { headers: { 'content-type': 'application/json', 'set-cookie': 'sid=shared-session; Domain=.atomclub.cn; Path=/; HttpOnly; SameSite=Lax' } });
  });
  const response = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13800000000', code: '123456' }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.doesNotMatch(response.headers.get('set-cookie'), /Domain=/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('business requests forward main-site Bearer/session identity without unrelated cookies', async t => {
  const request = await setup(t, async (url, options) => {
    assert.equal(String(url), 'https://upstream.test/api/doai/cards');
    assert.equal(options.headers.Authorization, 'Bearer user-session');
    assert.equal(options.headers.Cookie, 'sid=shared-session');
    assert.equal(options.headers['X-DOAI-Actor'], 'expected-account');
    return new Response(JSON.stringify({ error: { message: '需要登录' } }), { status: 401, headers: { 'content-type': 'application/json' } });
  });
  const response = await request('/api/doai/cards', { headers: { Authorization: 'Bearer user-session', Cookie: 'other=private; sid=shared-session', 'X-DOAI-Actor': 'expected-account' } });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.message, '需要登录');
});
test('unrelated routes never reach upstream, and network failure returns a useful error', async t => {
  let calls = 0;
  const request = await setup(t, async () => { calls++; throw Error('network down'); });
  assert.equal((await request('/api/admin/delete')).status, 404);
  assert.equal(calls, 0);
  const response = await request('/api/doai/me');
  assert.equal(response.status, 502);
  assert.match((await response.json()).error.message, /无法连接/);
});

test('flattened single-segment requests are restored to the real path', () => {
  assert.equal(restoreApiPath('/api/doai?__p=me'), '/api/doai/me');
  assert.equal(restoreApiPath('/api/doai?__p=registrations%2Fabc%2Fwork'), '/api/doai/registrations/abc/work');
  assert.equal(restoreApiPath('/api/doai?__p=notifications&userId=user-101'), '/api/doai/notifications?userId=user-101');
  assert.equal(restoreApiPath('/api/wx?__p=cover&u=https%3A%2F%2Fmmbiz.qpic.cn%2Fa.jpg'), '/api/wx/cover?u=https%3A%2F%2Fmmbiz.qpic.cn%2Fa.jpg');
  // 已经带完整路径的请求（本地 dev、其他调用方）保持原样。
  assert.equal(restoreApiPath('/api/doai/me'), '/api/doai/me');
  assert.equal(restoreApiPath('/api/doai/me?x=1'), '/api/doai/me?x=1');
  // 没有命名空间前缀时不做还原，避免构造出非 /api/... 的路径。
  assert.equal(restoreApiPath('/other?__p=me'), '/other?__p=me');
});
test('path traversal cannot escape the whitelist', async t => {
  let calls = 0;
  const request = await setup(t, async () => { calls++; return new Response('{}', { headers: { 'content-type': 'application/json' } }); });
  for (const path of ['/api/doai/../admin/delete', '/api/doai?__p=..%2Fadmin%2Fdelete', '/api/doai/../../user/me']) {
    const response = await request(path);
    assert.equal(response.status, 404, `${path} should be rejected`);
  }
  assert.equal(calls, 0);
  assert.equal(isAllowedApiPath('/api/admin/delete'), false);
  assert.equal(isAllowedApiPath('/api/doai/me'), true);
  assert.equal(isAllowedApiPath('/api/user/me'), true);
  assert.equal(isAllowedApiPath('/api/user/other'), false);
});
test('__p cannot jump to another namespace or smuggle a query string', async t => {
  let calls = 0;
  const request = await setup(t, async () => { calls++; return new Response('{}', { headers: { 'content-type': 'application/json' } }); });
  const escapes = [
    '/api/doai?__p=..%2Fauth%2Fsend-code',
    '/api/doai?__p=%2E%2E%2Fuser%2Fme',
    '/api/doai?__p=a%2F..%2F..%2Fauth%2Flogin',
    '/api/doai?__p=tickets%3Ffoo%3Dbar',
    '/api/doai?__p=.%2Fme',
  ];
  for (const path of escapes) {
    const response = await request(path);
    assert.equal(response.status, 404, `${path} should be rejected`);
  }
  assert.equal(calls, 0, 'no escape may reach upstream');
  // 非法尾段保留 __p，说明它没有被"成功还原"成别的路径。
  assert.match(restoreApiPath('/api/doai?__p=..%2Fauth%2Fsend-code'), /__p=/);
});
test('wx article covers are proxied only for official image hosts', async t => {
  const request = await setup(t, async url => {
    assert.equal(String(url), 'https://mmbiz.qpic.cn/a.jpg');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });
  });
  const ok = await request('/api/wx?__p=cover&u=https%3A%2F%2Fmmbiz.qpic.cn%2Fa.jpg');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'image/jpeg');
  assert.match(ok.headers.get('cache-control'), /max-age=86400/);
  const blocked = await request('/api/wx/cover?u=https%3A%2F%2Fevil.test%2Fa.jpg');
  assert.equal(blocked.status, 400);
  const insecure = await request('/api/wx/cover?u=http%3A%2F%2Fmmbiz.qpic.cn%2Fa.jpg');
  assert.equal(insecure.status, 400);
});
test('health probe reports whether the upstream doai module is published', async t => {
  const request = await setup(t, async () => new Response(JSON.stringify({ ok: true }), { status: 404, headers: { 'content-type': 'application/json' } }));
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.proxy, 'ok');
  assert.equal(body.upstream, 'https://upstream.test');
  assert.equal(body.doai, 'http_404');
});

test('logout forwards the old displayed actor and preserves a mismatch response without clearing cookies', async t => {
 const request = await setup(t, async (url, options) => {
  assert.equal(String(url), 'https://upstream.test/api/auth/logout'); assert.equal(options.headers['X-DOAI-Actor'], 'old-account');
  return new Response(JSON.stringify({error:{code:'DOAI_SESSION_CHANGED',message:'changed'}}),{status:409,headers:{'content-type':'application/json'}});
 });
 const response = await request('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-DOAI-Actor':'old-account'},body:'{}'});
 assert.equal(response.status,409);assert.equal(response.headers.get('set-cookie'),null);assert.equal((await response.json()).error.code,'DOAI_SESSION_CHANGED');
});
