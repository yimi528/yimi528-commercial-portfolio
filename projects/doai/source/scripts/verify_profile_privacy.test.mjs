import test from 'node:test';
import assert from 'node:assert/strict';
import { savePrivacySettings } from '../src/lib/profileApi.ts';
import { toDoaiUser } from '../src/lib/atomclubAuth.ts';

const withResponse = async (body, work) => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
  let request;
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async (_input, init) => { request = JSON.parse(init.body); return new Response(JSON.stringify(body)); };
  try { await work(() => request); } finally { globalThis.fetch = originalFetch; if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; }
};
const profile = { userId: 'self', isPublic: true, allowCardExchange: false };
test('privacy saves use confirmed actor-bound server fields, including false values', async () => {
  await withResponse({ ok: true, profile }, async request => {
    assert.deepEqual(await savePrivacySettings('self', { isPublicInSquare: true }), { isPublicInSquare: true, allowCardExchange: false });
    assert.deepEqual(request(), { expectedUserId: 'self', isPublicInSquare: true });
  });
});
test('missing, malformed, other-account and unconfirmed privacy writes cannot appear saved', async () => {
  for (const body of [
    { ok: true }, { profile }, { ok: true, profile: { ...profile, userId: 'other' } },
    { ok: true, profile: { ...profile, isPublic: false } }, { ok: true, profile: { ...profile, allowCardExchange: 'false' } },
  ]) await withResponse(body, async () => { await assert.rejects(savePrivacySettings('self', { isPublicInSquare: true }), /保存结果未确认/); });
  await withResponse({ ok: true, profile }, async () => { await assert.rejects(savePrivacySettings('self', { allowCardExchange: true }), /保存结果未确认/); });
});

test('unavailable or malformed supplemental privacy must not look like confirmed defaults', () => {
  for (const profile of [undefined, {}, { userId: 'other', isPublic: true, allowCardExchange: true }, { userId: 'self', isPublic: false, allowCardExchange: 'false' }]) {
    assert.equal(toDoaiUser({ id: 'self', profile }).privacyReady, false);
  }
  assert.equal(toDoaiUser({ id: 'self', profile: { userId: 'self', isPublic: false, allowCardExchange: false } }).privacyReady, true);
});
