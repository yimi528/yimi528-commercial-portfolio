import test from 'node:test';
import assert from 'node:assert/strict';
import { checkinCode, loadCheckins, validCheckinRecord } from '../src/lib/checkinApi.ts';
const record = { code: 'QA-PASS', gate: 'Gate A', holder: 'Holder', time: '2026-10-27T00:00:00.000Z' };
test('check-in confirmation requires a matching actual audit record', async () => {
  assert.equal(validCheckinRecord(record), true);
  for (const bad of [null, {}, { ...record, time: 'invalid' }, { ...record, code: '' }, { ...record, holder: null }]) assert.equal(validCheckinRecord(bad), false);
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    for (const body of [{ ok: true }, { ok: true, record: { ...record, code: 'OTHER' } }, { ok: false, record }]) {
      globalThis.fetch = async () => new Response(JSON.stringify(body));
      await assert.rejects(checkinCode(record.code, record.gate), /核销结果未确认/);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, record }));
    assert.deepEqual(await checkinCode(record.code, record.gate), record);
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, checkins: [{}] }));
    await assert.rejects(loadCheckins(), /核销记录未读取成功/);
  } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});
