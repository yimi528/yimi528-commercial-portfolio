import test from 'node:test';
import assert from 'node:assert/strict';
import { forums } from '../src/data/plan.ts';
import { FORUM_IDS, forumSchedule, forumRules, forumIdFromBookingKey } from '../src/lib/forumSchedule.ts';
test('withdrawn forum sessions stay private while legacy passes retain their schedules', () => {
  assert.deepEqual(forums, []);
  for (const id of FORUM_IDS) {
    const slot = forumSchedule(id);
    assert.ok(slot);
    assert.equal(Date.parse(slot.startsAt) - Date.parse(slot.cancellationDeadline), 48 * 3600000);
    assert.ok(Date.parse(slot.endsAt) > Date.parse(slot.startsAt));
  }
});
test('cancellation closes at the exact 48-hour boundary regardless of local timezone', () => {
  const cutoff = Date.parse('2026-12-04T10:00:00+08:00');
  assert.equal(forumRules('forum-1', cutoff - 1).cancellationOpen, true);
  assert.equal(forumRules('forum-1', cutoff).cancellationOpen, false);
  assert.equal(forumRules('forum-1', cutoff + 1).cancellationOpen, false);
  assert.equal(forumRules('forum-2', cutoff).cancellationOpen, true);
  assert.equal(forumRules('forum-2', Date.parse('2026-12-04T14:00:00+08:00')).cancellationOpen, false);
});
test('booking ends at the published session end and unknown keys never acquire a deadline', () => {
  assert.equal(forumRules('forum-1', Date.parse('2026-12-06T12:00:00+08:00')).bookingOpen, false);
  for (const key of ['forum:forum-0', 'forum:forum-19', 'forum:forum-01', 'attendance:forum-1', 'forum:unknown']) assert.equal(forumIdFromBookingKey(key), null);
  assert.equal(forumIdFromBookingKey('forum:forum-1'), 'forum-1');
});
