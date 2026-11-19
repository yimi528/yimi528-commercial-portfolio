import test from 'node:test';
import assert from 'node:assert/strict';
import { logoutAtomclub } from '../src/lib/atomclubAuth.ts';

test('late logout clears only the tokens belonging to its original session', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const values = new Map([['user_token', 'old-token'], ['atomhub_user_token', 'old-legacy-token']]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) };
  let respond;
  globalThis.fetch = () => new Promise(resolve => { respond = resolve; });
  try {
    const pending = logoutAtomclub();
    values.set('user_token', 'new-session-token');
    respond(new Response(JSON.stringify({ ok: true })));
    await pending;
    assert.equal(values.get('user_token'), 'new-session-token');
    assert.equal(values.has('atomhub_user_token'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
