import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarInitial, escapeAvatarText } from '../src/lib/avatar.ts';
import { getAtomclubUser, toDoaiUser } from '../src/lib/atomclubAuth.ts';
import { maskedAccountPhone } from '../src/lib/accountPhone.ts';

test('avatar initials preserve emoji code points and valid XML text', () => {
  assert.equal(avatarInitial('😀 Alice'), '😀');
  assert.equal(avatarInitial('  张三'), '张');
  assert.equal(avatarInitial('  '), 'A');
  assert.equal(escapeAvatarText('<&'), '&lt;&amp;');
});
test('emoji profile names produce a readable fallback avatar without breaking login identity', () => {
  const user = toDoaiUser({ id: 'emoji-user', name: 'Main Name', profile: { name: '😀 Alice' } });
  assert.equal(user.name, '😀 Alice');
  const svg = decodeURIComponent(user.avatar.slice(user.avatar.indexOf(',') + 1));
  assert.ok(svg.includes('>😀</text>'));
  const escaped = toDoaiUser({ id: 'xml-user', name: '<not-markup' });
  assert.ok(decodeURIComponent(escaped.avatar).includes('&lt;</text>'));
});
test('a successful HTTP response without an account ID cannot create a fake signed-in identity', async () => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
  let calls = 0;
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ ok: true, name: 'Missing identity' })); };
  try { await assert.rejects(getAtomclubUser(), /账号资料未读取成功/); assert.equal(calls, 1); }
  finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage;
  }
});

test('main mapper masked phone is available for display without becoming a raw contact or identity key', () => {
  const user = toDoaiUser({ id: 'self', maskedPhone: '138****0000' });
  assert.equal(user.maskedPhone, '138****0000'); assert.equal(user.phone, '');
  assert.equal(maskedAccountPhone(undefined, '13800000000'), '138****0000');
  assert.equal(maskedAccountPhone({}, {}), '');
  assert.equal(maskedAccountPhone('not-a-phone'), '');
  assert.equal(maskedAccountPhone('13800000000'), '');
});
