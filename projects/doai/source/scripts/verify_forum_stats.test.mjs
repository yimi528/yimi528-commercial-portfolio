import test from 'node:test';
import assert from 'node:assert/strict';
import { loadForumStatistics } from '../src/lib/forumStatsApi.ts';
import { FORUM_IDS } from '../src/lib/forumSchedule.ts';
const rows = () => FORUM_IDS.map(id => ({ id, bookedCount: 0, checkedInCount: 0 }));
test('forum counts require a unique dynamic list and nonnegative coherent numbers', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => null };
  try {
    for (const body of [{ ok: true }, { ok: true, forums: [...rows().slice(1), rows()[1]] },
      { ok: true, forums: rows().map((row,index) => index ? row : { ...row, bookedCount: -1 }) },
      { ok: true, forums: rows().map((row,index) => index ? row : { ...row, checkedInCount: 1 }) },
      { ok: true, forums: rows().map((row,index) => index ? row : { ...row, bookedCount: '0' }) }]) {
      globalThis.fetch = async () => new Response(JSON.stringify(body)); await assert.rejects(loadForumStatistics(), /预约统计未读取成功/);
    }
    const valid = rows(); valid[0] = { id: 'forum-1', bookedCount: 550, checkedInCount: 100 };
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, forums: valid })); assert.deepEqual(await loadForumStatistics(), valid);
  } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});

test('withdrawn programme has no published rows or invented zero-count sessions', async () => {
  const old = globalThis.fetch;
  try { globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,forums:[]})); assert.deepEqual(await loadForumStatistics(),[]); }
  finally { globalThis.fetch=old; }
});
