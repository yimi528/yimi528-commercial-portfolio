import test from 'node:test';
import assert from 'node:assert/strict';
import { cardProfile } from '../src/lib/cardProfile.ts';
import { exchangeCardSnapshot, wallCardSnapshot, readCardExchange, loadExchangeCards } from '../src/lib/socialApi.ts';
import { bindDoaiActor } from '../src/lib/authSession.ts';
import { loadTalents } from '../src/lib/communityApi.ts';

test('card display fields reject object coercion, clean skill lists and exclude account contact fields', () => {
  const card = cardProfile({ name: {}, city: [], avatar: {}, roleTitle: false, bio: null, phone: '13800000000', email: 'private@example.com', skills: [' React ', {}, null, '', 'React', 'SQL'] });
  assert.deepEqual(card, { name: '', city: '', avatar: '', roleTitle: '', org: '', bio: '', skills: ['React', 'SQL'] });
  assert.ok(!('phone' in card)); assert.ok(!('email' in card));
  assert.equal(cardProfile({ name: '😀'.repeat(65) }).name, '😀'.repeat(64));
  assert.deepEqual(wallCardSnapshot({ id: 'peer', name: 'Peer', atomclubVerified: 'yes', skills: 'not-a-list' }).skills, []);
  assert.equal(wallCardSnapshot({ id: 'peer', atomclubVerified: 'yes' }).atomclubVerified, false);
  for (const value of [null, [], {}, { id: '' }, { id: ' padded ' }]) assert.throws(() => wallCardSnapshot(value), /资料未确认/);
});

test('received cards never promise a phone unlock and exchange dates use the Shanghai calendar', () => {
  const snapshot = exchangeCardSnapshot('pair', { name: 'Peer', phone: '交换后可见' }, 'in', '2026-10-26T23:30:00Z');
  assert.equal(snapshot.phone, ''); assert.equal(snapshot.contactStatus, 'not_shared'); assert.equal(snapshot.exchangedAt, '2026-10-27');
  const empty = exchangeCardSnapshot('pair', {}, 'out', '2026-10-26T13:30:00Z');
  assert.equal(empty.phone, ''); assert.equal(empty.contactStatus, 'unavailable'); assert.equal(empty.exchangedAt, '2026-10-26');
  assert.equal(exchangeCardSnapshot('pair', { phone: '13800000000', contactStatus: 'not_shared' }, 'out', '2026-10-26').phone, '');
  assert.equal(exchangeCardSnapshot('pair', { phone: '13800000000' }, 'out', '2026-10-26').phone, '');
  for (const [direction, at] of [['bad', '2026-10-26'], ['in', 'invalid'], ['in', '']]) assert.throws(() => exchangeCardSnapshot('pair', {}, direction, at), /回执未确认/);
});

test('an exchange receipt must confirm both acting owner and selected peer before populating the card box', () => {
  const value = { ok: true, exchange: { id: 'pair', fromUserId: 'self', toUserId: 'peer', from: { id: 'self' }, to: { id: 'peer', name: 'Saved peer' }, direction: 'out', at: '2026-10-26T23:30:00Z' } };
  assert.equal(readCardExchange(value, 'self', 'peer').name, 'Saved peer');
  for (const exchange of [{ ...value.exchange, fromUserId: 'other' }, { ...value.exchange, toUserId: 'other' }, { ...value.exchange, from: { id: 'other' } }, { ...value.exchange, to: { id: 'other' } }, { ...value.exchange, direction: undefined }]) assert.throws(() => readCardExchange({ ok: true, exchange }, 'self', 'peer'), /未确认/);
  assert.throws(() => readCardExchange({ ...value, ok: 'true' }, 'self', 'peer'), /未确认/);
});

test('malformed or duplicated saved-card envelopes fail visibly, while invalid presentation fields remain displayable', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null }; bindDoaiActor('self', null);
  const row = { id: 'pair', direction: 'in', exchangedAt: '2026-10-26T23:30:00Z', card: { id: 'peer', name: 'Peer', skills: ['React', {}] } };
  try {
    for (const cards of [[null], [{ ...row, card: null }], [{ ...row, direction: 'bad' }], [row, row]]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ cards }));
      await assert.rejects(loadExchangeCards());
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ cards: [row] }));
    const [saved] = await loadExchangeCards(); assert.deepEqual(saved.skills, ['React']); assert.equal(saved.exchangedAt, '2026-10-27');
  } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});

test('talent cards sanitize presentation fields, omit explicitly private rows and reject uncertain privacy or counts', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null }; bindDoaiActor('self', null);
  const peer = { id: 'peer', name: 'Peer', city: {}, bio: {}, skills: ['React', {}], likes: 1, hasLiked: 'yes', isPublic: true };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ talents: [peer, { id: 'private', isPublic: false }] }));
    const cards = await loadTalents(); assert.equal(cards.length, 1); assert.deepEqual(cards[0].skills, ['React']); assert.equal(cards[0].city, ''); assert.equal(cards[0].hasLiked, false);
    for (const row of [{ ...peer, isPublic: undefined }, { ...peer, likes: -1 }, { ...peer, id: '' }]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ talents: [row] })); await assert.rejects(loadTalents());
    }
  } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
});
