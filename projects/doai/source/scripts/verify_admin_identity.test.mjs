import test from 'node:test';
import assert from 'node:assert/strict';
import { getAtomclubUser, toDoaiUser } from '../src/lib/atomclubAuth.ts';

test('only explicit server permission identifies an administrator; matching display names do not', () => {
  for (const name of ['小北', 'Might', 'yimi528']) {
    assert.equal(toDoaiUser({ id: 'ordinary-account', name }).role, 'maker');
    assert.equal(toDoaiUser({ id: 'ordinary-account', name, isAdmin: 'true' }).role, 'maker');
  }
  assert.equal(toDoaiUser({ id: 'authorized-account', isAdmin: true }).role, 'admin');
});

test('failed DOAI authorization lookup cannot inherit an admin flag from the account response', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async input => {
    if (String(input).includes('__p=me') && String(input).startsWith('/api/user')) {
      return new Response(JSON.stringify({ id: 'ordinary-account', name: 'yimi528', isAdmin: true }));
    }
    return new Response(JSON.stringify({ error: { message: 'unavailable' } }), { status: 503 });
  };
  try {
    const user = await getAtomclubUser();
    assert.equal(user.isAdmin, false);
    assert.equal(toDoaiUser(user).role, 'maker');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
