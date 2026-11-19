import test from 'node:test';
import assert from 'node:assert/strict';
import { validAttendanceTicket, reviewAttendance } from '../src/lib/attendanceApi.ts';
const pending = { id: 'application', bookingKey: 'attendance:media:seat-open', type: 'guest', status: 'pending_review', holderName: 'Maker', holderPhone: '13800000000', qrCode: '' };
test('pending and rejected attendance applications never expose usable QR codes', () => {
  assert.equal(validAttendanceTicket(pending), true);
  assert.equal(validAttendanceTicket({ ...pending, status: 'rejected' }), true);
  assert.equal(validAttendanceTicket({ ...pending, qrCode: 'EARLY-CODE' }), false);
  assert.equal(validAttendanceTicket({ ...pending, status: 'claimed' }), false);
  assert.equal(validAttendanceTicket({ ...pending, status: 'claimed', qrCode: 'APPROVED-CODE' }), true);
});
test('attendance review requires a matching confirmed result and explicit final status', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => null };
  try {
    for (const ticket of [pending, { ...pending, id: 'other', status: 'claimed', qrCode: 'QA' }]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, ticket }));
      await assert.rejects(reviewAttendance('application', 'claimed', ''), /结果未确认/);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, ticket: { ...pending, status: 'claimed', qrCode: 'QA' } }));
    assert.equal((await reviewAttendance('application', 'claimed', '')).qrCode, 'QA');
  } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});
