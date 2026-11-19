import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl, flattenApiPath, mapApiNamespace, resolveApiPath, wxCoverUrl } from '../src/lib/api.ts';

/* ------------------------------------------------------------------ 独立部署（Vercel / dev） */
// BASE_URL = '/'：serverless 函数只命中单段，业务多段路径压进 __p。

test('独立部署：业务路径压进 __p 并映射到 doai 命名空间', () => {
  assert.equal(resolveApiPath('/api/cards', ''), '/api/doai?__p=cards');
  assert.equal(resolveApiPath('/api/my-team?userId=user-101', ''), '/api/doai?userId=user-101&__p=my-team');
  assert.equal(resolveApiPath('/api/registrations/abc/work', ''), '/api/doai?__p=registrations%2Fabc%2Fwork');
});

test('独立部署：账号路径保留自己的命名空间', () => {
  assert.equal(resolveApiPath('/api/user/me', ''), '/api/user?__p=me');
  assert.equal(resolveApiPath('/api/auth/login', ''), '/api/auth?__p=login');
  assert.equal(resolveApiPath('/api/doai/me', ''), '/api/doai?__p=me');
});

test('独立部署：公众号接口走本站代理，不并入 doai', () => {
  const cover = resolveApiPath('/api/wx/cover?u=https%3A%2F%2Fmmbiz.qpic.cn%2Fa.jpg', '');
  const parsed = new URL(cover, 'http://localhost');
  assert.equal(parsed.pathname, '/api/wx');
  assert.equal(parsed.searchParams.get('__p'), 'cover');
  // u= 已经过 encodeURIComponent，往返后仍必须保持可解析。
  assert.equal(parsed.searchParams.get('u'), 'https://mmbiz.qpic.cn/a.jpg');
  assert.equal(resolveApiPath('/api/wx-articles', ''), '/api/wx-articles');
});

test('单段与站内路径不被改写', () => {
  assert.equal(flattenApiPath('/api/health'), '/api/health');
  assert.equal(flattenApiPath('/api/doai'), '/api/doai');
  assert.equal(flattenApiPath('/dashboard'), '/dashboard');
  assert.equal(flattenApiPath('/assets/index-abc.js'), '/assets/index-abc.js');
});

/* ------------------------------------------------------------------ /doai/ 子站（nginx 反代） */
// BASE=/doai/：纯静态 + 反代，走真实多段路径，不做 __p 压缩。
// 线上实测 /doai/api/doai/me → 401，/doai/api/doai?__p=me → 404。

test('子路径部署：请求带 /doai 前缀并保留真实多段路径', () => {
  assert.equal(resolveApiPath('/api/cards', '/doai'), '/doai/api/doai/cards');
  assert.equal(resolveApiPath('/api/registrations/abc/work', '/doai'), '/doai/api/doai/registrations/abc/work');
  assert.equal(resolveApiPath('/api/doai/me', '/doai'), '/doai/api/doai/me');
  assert.equal(resolveApiPath('/api/user/me', '/doai'), '/doai/api/user/me');
  assert.equal(resolveApiPath('/api/auth/send-code', '/doai'), '/doai/api/auth/send-code');
  assert.equal(resolveApiPath('/api/health', '/doai'), '/doai/api/health');
});

test('子路径部署：公众号图文并入 doai 命名空间（后端只有 /api/doai/wx-articles）', () => {
  assert.equal(resolveApiPath('/api/wx-articles', '/doai'), '/doai/api/doai/wx-articles');
  assert.equal(resolveApiPath('/api/wx/articles', '/doai'), '/doai/api/doai/wx/articles');
});

test('封面代理只在独立部署启用；子站给原图地址', () => {
  const cover = 'https://mmbiz.qpic.cn/a.jpg';
  assert.equal(wxCoverUrl(cover, true), cover);
  assert.equal(wxCoverUrl(cover, false), `/api/wx?u=${encodeURIComponent(cover)}&__p=cover`);
});

test('命名空间映射可以独立断言', () => {
  assert.equal(mapApiNamespace('/api/doai/me', false), '/api/doai/me');
  assert.equal(mapApiNamespace('/api/tickets', false), '/api/doai/tickets');
  assert.equal(mapApiNamespace('/api/tickets', true), '/api/doai/tickets');
  assert.equal(mapApiNamespace('/api/wx-articles', true), '/api/doai/wx-articles');
  assert.equal(mapApiNamespace('/api/wx-articles', false), '/api/wx-articles');
  assert.equal(apiUrl('/api/already'), '/api/doai?__p=already');
});
