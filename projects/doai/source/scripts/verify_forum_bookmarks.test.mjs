import test from 'node:test';
import assert from 'node:assert/strict';
import { loadForumBookmarks, saveForumBookmark } from '../src/lib/forumBookmarksApi.ts';
import { forumShareLink, forumShareText } from '../src/lib/forumShare.ts';
const withResult = async (body, work) => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => null }; let input;
  globalThis.fetch = async (_url, init) => { input = init.body && JSON.parse(init.body); return new Response(JSON.stringify(body)); };
  try { await work(() => input); } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
};
const bookmark = { id: 'forum-1', createdAt: '2026-10-27T00:00:00.000Z' };
test('bookmarks must be confirmed for the expected account and have valid unique published IDs', async () => {
  for (const body of [{ ok: true }, { ok: true, userId: 'other', bookmarks: [bookmark] }, { ok: true, userId: 'self', bookmarks: [bookmark, bookmark] }, { ok: true, userId: 'self', bookmarks: [{ ...bookmark, id: 'forum-99' }] }, { ok: true, userId: 'self', bookmarks: [{ ...bookmark, createdAt: 'invalid' }] }]) {
    await withResult(body, async () => { await assert.rejects(loadForumBookmarks('self')); });
  }
  await withResult({ ok: true, userId: 'self', bookmarks: [bookmark] }, async () => assert.deepEqual(await loadForumBookmarks('self'), [bookmark]));
});
test('save and removal require an explicit matching desired state before changing a bookmark', async () => {
  for (const body of [{ ok: true }, { ok: true, userId: 'other', bookmark: { ...bookmark, saved: true } }, { ok: true, userId: 'self', bookmark: { ...bookmark, saved: false } }]) {
    await withResult(body, async () => { await assert.rejects(saveForumBookmark('self', 'forum-1', true), /结果未确认/); });
  }
  await withResult({ ok: true, userId: 'self', bookmark: { ...bookmark, saved: true } }, async input => {
    assert.deepEqual(await saveForumBookmark('self', 'forum-1', true), bookmark); assert.deepEqual(input(), { expectedUserId: 'self', id: 'forum-1', saved: true });
  });
  await withResult({ ok: true, userId: 'self', bookmark: { id: 'forum-1', saved: false } }, async () => assert.equal(await saveForumBookmark('self', 'forum-1', false), null));
});
test('forum share text includes a canonical openable URL in root and subpath deployments', () => {
  assert.equal(forumShareLink('forum-1', 'https://atomclub.cn', '/doai/'), 'https://atomclub.cn/doai/detail/forum/forum-1');
  assert.equal(forumShareLink('forum-1', 'https://site.example', ''), 'https://site.example/detail/forum/forum-1');
  assert.ok(forumShareText('Forum', '2026-12-06', '10:00 - 12:00', 'Venue', 'https://site.example/detail/forum/forum-1').endsWith('\nhttps://site.example/detail/forum/forum-1'));
});
