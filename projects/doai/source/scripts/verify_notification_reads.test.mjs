import test from 'node:test';
import assert from 'node:assert/strict';
import { saveNotificationReads } from '../src/lib/socialApi.ts';
import { bindDoaiActor } from '../src/lib/authSession.ts';
async function scenario(work) {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null }; bindDoaiActor('self', null);
  const calls = [];
  const respond = body => { globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), actor: init.headers.get('X-DOAI-Actor') });
    return body instanceof Response ? body : new Response(JSON.stringify(body));
  }; };
  try { await work({ calls, respond }); } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
}
test('read confirmation matches the exact loaded IDs and real account, independent of response ordering', async () => scenario(async ({ respond, calls }) => {
  respond({ ok: true, userId: 'self', readIds: ['second', 'first'] });
  assert.deepEqual(await saveNotificationReads('self', ['first', 'second', 'first']), ['second', 'first']);
  assert.deepEqual(calls[0].body, { ids: ['first', 'second'], expectedUserId: 'self' });
  assert.equal(calls[0].actor, 'self'); assert.ok(calls[0].url.includes('read-ids'));
}));
test('missing, wrong-account, incomplete, extra or duplicate read receipts cannot change local state', async () => scenario(async ({ respond }) => {
  for (const body of [{ ok: true }, { ok: true, userId: 'other', readIds: ['first', 'second'] }, { ok: true, userId: 'self', readIds: ['first'] }, { ok: true, userId: 'self', readIds: ['first', 'third'] }, { ok: true, userId: 'self', readIds: ['first', 'first'] }]) {
    respond(body); await assert.rejects(saveNotificationReads('self', ['first', 'second']), /已读状态未确认/);
  }
}));
test('an empty snapshot is a safe no-op and invalid lists cannot become a read-all request', async () => scenario(async ({ respond, calls }) => {
  respond({ ok: true }); assert.deepEqual(await saveNotificationReads('self', []), []);
  for (const ids of [[''], [' padded '], ['x'.repeat(37)], [null], Array.from({ length: 501 }, (_, i) => `id-${i}`)]) await assert.rejects(saveNotificationReads('self', ids), /消息列表异常/);
  assert.equal(calls.length, 0);
}));
test('an older backend receives only the additive endpoint, with no fallback mutation', async () => scenario(async ({ respond, calls }) => {
  respond(new Response('{"message":"Cannot POST read-ids"}', { status: 404 }));
  await assert.rejects(saveNotificationReads('self', ['first']), /消息不存在或服务暂不可用/);
  assert.equal(calls.length, 1); assert.ok(calls[0].url.includes('read-ids'));
}));
