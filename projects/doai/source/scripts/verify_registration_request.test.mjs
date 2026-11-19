import test from 'node:test';
import assert from 'node:assert/strict';
import { saveRegistration, pendingRegistrationKey, clearRegistrationRequest, RegistrationConflict } from '../src/lib/registrationRequest.ts';
import { encodeEntrySummary, readEntrySummary } from '../src/lib/contestEntry.ts';
import { registrationContentKey } from '../src/lib/registrationContent.ts';
import { bindDoaiActor } from '../src/lib/authSession.ts';

const draft = { type: 'team', track: 'creator', teamName: 'Team', projectName: 'Project', projectSummary: 'Summary', videoUrl: '', docUrl: '', members: [{ id: 'self', name: 'Owner', phone: '', roleTitle: '', isLeader: true }, { id: 'm-123', name: 'Peer', phone: '', roleTitle: '', isLeader: false }] };
const receipt = (uid, key, overrides = {}) => ({ ok: true, userId: uid, requestKey: key, found: true, created: false,
  registration: { ...draft, members: draft.members.map(m => m.isLeader ? { ...m, id: uid } : m), id: 'reg', ownerUserId: uid, makerId: 'MAKER', status: 'submitted', submittedAt: '2026-10-27T00:00:00Z', accountContact: { userId: uid, phone: '13800000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } },
  ticket: { id: 'ticket', ownerUserId: uid, bookingKey: 'registration:reg', type: 'maker', status: 'claimed', qrCode: 'QR' }, ...overrides });
const notFound = (uid, key) => ({ ok: true, userId: uid, requestKey: key, found: false, contactPolicy: 'account' });
let sequence = 0;
async function scenario(work, storage) {
  const old = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  const uid = `qa-${++sequence}`, calls = [];
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = storage || { getItem: () => null, setItem() {}, removeItem() {} };
  bindDoaiActor(uid, null);
  const key = pendingRegistrationKey(uid);
  const setFetch = handler => { globalThis.fetch = async (url, init) => {
    const call = { url: String(url), method: init?.method || 'GET', body: init?.body && JSON.parse(init.body) };
    calls.push(call);
    const result = await handler(call);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result));
  }; };
  try { await work({ uid, key, calls, setFetch }); }
  finally { clearRegistrationRequest(uid, pendingRegistrationKey(uid)); Object.assign(globalThis, old); }
}

test('removed and unsupported raw categories cannot send a registration request', async () => scenario(async ({ uid, calls, setFetch }) => {
  setFetch(() => { throw new Error('Closed tracks must not reach the API'); });
  for (const track of ['overseas', 'unknown']) {
    await assert.rejects(saveRegistration({ ...draft, track }, uid, () => true), /自由创意赛道与 FDE 赛道开放报名/);
  }
  assert.equal(calls.length, 0);
}));

test('FDE registration reaches the API and preserves the selected industry track', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  const current = { ...draft, track: 'industry' };
  const saved = receipt(uid, key);
  saved.registration.track = 'industry';
  setFetch(call => call.method === 'GET' ? notFound(uid, key) : saved);
  const confirmed = await saveRegistration(current, uid, () => true);
  assert.equal(calls.find(call => call.method === 'POST').body.track, 'industry');
  assert.equal(confirmed.registration.track, 'industry');
}));

test('email and bio are validated, require snapshot-v2 and participate in saved content checks', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  const applicant = { name: 'Owner', city: '上海', skills: [], email: 'owner@example.com', bio: 'AI developer' };
  const current = { ...draft, applicant };
  setFetch(() => ({ ...notFound(uid, key), applicantPolicy: 'snapshot-v1' }));
  for (const invalid of [{ ...applicant, email: '' }, { ...applicant, email: 'invalid' }, { ...applicant, bio: ' ' }, { ...applicant, bio: 'x'.repeat(2001) }]) {
    await assert.rejects(saveRegistration({ ...current, applicant: invalid }, uid, () => true), /有效邮箱和个人简介/);
  }
  assert.equal(calls.length, 0);
  await assert.rejects(saveRegistration(current, uid, () => true), /报名资料保存服务暂不可确认/);
  assert.equal(calls.filter(call => call.method === 'POST').length, 0);
  const saved = receipt(uid, key); saved.registration.applicant = { ...applicant, userId: uid };
  setFetch(call => call.method === 'GET' ? { ...notFound(uid, key), applicantPolicy: 'snapshot-v2' } : saved);
  const confirmed = await saveRegistration(current, uid, () => true);
  assert.equal(confirmed.registration.applicant.email, applicant.email);
  assert.equal(confirmed.registration.applicant.bio, applicant.bio);
  for (const change of [{ email: 'changed@example.com' }, { bio: 'Changed introduction' }]) {
    assert.notEqual(registrationContentKey(current, uid), registrationContentKey({ ...current, applicant: { ...applicant, ...change } }, uid));
  }
}));

test('canonical registration content ignores temporary row IDs and order while preserving actual member identity and content', () => {
  const recreated = { ...draft, members: [{ ...draft.members[1], id: 'm-987' }, draft.members[0]] };
  assert.equal(registrationContentKey(draft, 'self'), registrationContentKey(recreated, 'self'));
  assert.notEqual(registrationContentKey(draft, 'self'), registrationContentKey({ ...draft, members: [draft.members[0], { ...draft.members[1], id: 'real-account' }] }, 'self'));
  assert.notEqual(registrationContentKey(draft, 'self'), registrationContentKey({ ...draft, projectName: 'Edited' }, 'self'));
});

test('legacy registration content bytes stay stable, while applicant city and skills participate in new retry identity', () => {
  assert.equal(registrationContentKey(draft, 'self'), '{"projectName":"Project","teamName":"Team","track":"creator","type":"team","projectSummary":"Summary","videoUrl":"","docUrl":"","members":[{"id":"self","name":"Owner","phone":"","roleTitle":"","isLeader":true},{"id":"","name":"Peer","phone":"","roleTitle":"","isLeader":false}]}');
  const current = { ...draft, applicant: { name: ' Owner ', city: ' 上海 ', skills: [' React ', '', 'React', 'SQL'] } };
  const normalized = { ...draft, applicant: { userId: 'forged', name: 'Owner', city: '上海', skills: ['React', 'SQL'] } };
  assert.equal(registrationContentKey(current, 'self'), registrationContentKey(normalized, 'self'));
  assert.notEqual(registrationContentKey(current, 'self'), registrationContentKey({ ...normalized, applicant: { ...normalized.applicant, city: '成都' } }, 'self'));
});

test('applicant writes require backend capability and a complete saved snapshot before success', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  const current = { ...draft, applicant: { name: 'Owner', city: '成都', skills: ['React'] } };
  setFetch(() => notFound(uid, key));
  await assert.rejects(saveRegistration(current, uid, () => true), /报名资料保存服务暂不可确认/);
  assert.equal(calls.length, 1);
  setFetch(call => call.method === 'GET' ? { ...notFound(uid, key), applicantPolicy: 'snapshot-v1' } : receipt(uid, key, { created: true }));
  await assert.rejects(saveRegistration(current, uid, () => true), /报名资料保存未确认/);
  assert.equal(pendingRegistrationKey(uid), key);
  const saved = receipt(uid, key); saved.registration.applicant = { ...current.applicant, userId: uid };
  setFetch(() => saved);
  assert.deepEqual((await saveRegistration(current, uid, () => true)).registration.applicant, saved.registration.applicant);
}));

test('lost response retains the same key and recovery uses GET without creating a second entry', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  setFetch(call => { if (call.method === 'GET') return notFound(uid, key); throw new Error('Lost response'); });
  await assert.rejects(saveRegistration(draft, uid, () => true), /Lost response/);
  assert.equal(pendingRegistrationKey(uid), key);
  assert.equal(calls[1].body.requestKey, key); assert.equal(calls[1].body.expectedUserId, uid);
  setFetch(() => receipt(uid, key));
  const recovered = await saveRegistration(draft, uid, () => true);
  assert.equal(recovered.registration.id, 'reg'); assert.equal(recovered.created, false);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  assert.notEqual(pendingRegistrationKey(uid), key);
}));

test('changed draft shows the saved record and requires explicit rotation before posting another entry', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  setFetch(() => receipt(uid, key));
  await assert.rejects(saveRegistration({ ...draft, projectName: 'Edited' }, uid, () => true), error => error instanceof RegistrationConflict && error.registration.id === 'reg' && error.requestKey === key);
  assert.equal(pendingRegistrationKey(uid), key);
  assert.equal(calls.some(call => call.method === 'POST'), false);
  clearRegistrationRequest(uid, key);
  const fresh = pendingRegistrationKey(uid);
  assert.notEqual(fresh, key);
  setFetch(call => call.method === 'GET' ? notFound(uid, fresh) : receipt(uid, fresh, { created: true }));
  assert.equal((await saveRegistration(draft, uid, () => true)).created, true);
}));

test('missing backend capability, malformed recovery and cross-account responses never trigger POST', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  for (const response of [{ ok: true }, notFound('other', key), notFound(uid, 'wrong-key'), { ...notFound(uid, key), contactPolicy: undefined }, { ...notFound(uid, key), found: 0 }, new Response('{"message":"Cannot GET"}', { status: 404 })]) {
    setFetch(() => response);
    await assert.rejects(saveRegistration(draft, uid, () => true));
    assert.equal(pendingRegistrationKey(uid), key);
  }
  assert.ok(calls.every(call => call.method === 'GET'));
}));

test('unconfirmed ownership, ticket correlation, state or content cannot be accepted as a successful registration', async () => scenario(async ({ uid, key, setFetch }) => {
  const valid = receipt(uid, key);
  for (const change of [
    { userId: 'other' }, { requestKey: 'other-key' }, { created: undefined },
    { registration: { ...valid.registration, ownerUserId: 'other' } },
    { registration: { ...valid.registration, status: 'unknown' } },
    { registration: { ...valid.registration, members: [] } },
    { registration: { ...valid.registration, accountContact: { userId: 'other', phone: '13800000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } } },
    { ticket: { ...valid.ticket, ownerUserId: 'other' } },
    { ticket: { ...valid.ticket, bookingKey: 'registration:other' } },
    { ticket: { ...valid.ticket, type: 'guest' } },
    { ticket: { ...valid.ticket, status: 'cancelled' } },
    { ticket: { ...valid.ticket, qrCode: '' } },
  ]) {
    setFetch(call => call.method === 'GET' ? notFound(uid, key) : { ...valid, ...change });
    await assert.rejects(saveRegistration(draft, uid, () => true), /回执未确认/);
    assert.equal(pendingRegistrationKey(uid), key);
  }
}));

test('account switch after preflight prevents POST and leaves the original account recovery key', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  let current = true;
  setFetch(() => { current = false; return notFound(uid, key); });
  await assert.rejects(saveRegistration(draft, uid, () => current), /账号已切换/);
  assert.equal(calls.length, 1); assert.equal(pendingRegistrationKey(uid), key);
}));

test('recovery retains the actual review state, feedback and checked-in ticket', async () => scenario(async ({ uid, key, setFetch }) => {
  const value = receipt(uid, key);
  value.registration.status = 'rejected'; value.registration.reviewFeedback = 'Actual decision'; value.ticket.status = 'checked_in';
  setFetch(() => value);
  const result = await saveRegistration(draft, uid, () => true);
  assert.equal(result.registration.status, 'rejected'); assert.equal(result.registration.reviewFeedback, 'Actual decision'); assert.equal(result.ticket.status, 'checked_in');
}));

test('session key survives reload imports and inaccessible storage falls back safely without persisting draft details', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  await scenario(async ({ uid, key }) => {
    assert.ok([...values.values()].every(value => /^[a-zA-Z0-9_-]{8,64}$/.test(value)));
    const reloaded = await import(`../src/lib/registrationRequest.ts?reload=${Date.now()}`);
    assert.equal(reloaded.pendingRegistrationKey(uid), key);
  }, storage);
  await scenario(async ({ uid, key }) => {
    assert.equal(pendingRegistrationKey(uid), key);
    clearRegistrationRequest(uid, key);
    assert.notEqual(pendingRegistrationKey(uid), key);
  }, { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); }, removeItem() { throw new Error('Blocked'); } });
});


test('overseas affiliation survives lost-response recovery and changes require a distinct entry', async () => scenario(async ({ uid, key, calls, setFetch }) => {
  const overseas = { countryOrRegion: 'United Kingdom', university: 'University of Oxford' };
  const current = { ...draft, projectSummary: encodeEntrySummary('ai-app', 'Overseas project', overseas) };
  setFetch(call => { if (call.method === 'GET') return notFound(uid, key); throw new Error('Lost response'); });
  await assert.rejects(saveRegistration(current, uid, () => true), /Lost response/);
  assert.deepEqual(readEntrySummary(calls[1].body.projectSummary).overseas, overseas);
  const saved = receipt(uid, key); saved.registration.projectSummary = current.projectSummary;
  setFetch(() => saved);
  const changed = { ...current, projectSummary: encodeEntrySummary('ai-app', 'Overseas project', { ...overseas, university: 'University of Cambridge' }) };
  await assert.rejects(saveRegistration(changed, uid, () => true), RegistrationConflict);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  const recovered = await saveRegistration(current, uid, () => true);
  assert.deepEqual(readEntrySummary(recovered.registration.projectSummary).overseas, overseas);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
}));
