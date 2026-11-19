import test from 'node:test';
import assert from 'node:assert/strict';
import { syncAtomclubProfile, getAtomclubUser, toDoaiUser } from '../src/lib/atomclubAuth.ts';
import { ApiError } from '../src/lib/api.ts';

const withFetch = async (fetcher, work) => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.fetch = fetcher; globalThis.localStorage = { getItem: () => null };
  try { await work(); } finally { globalThis.fetch = oldFetch; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('sync copies fresh authority fields, resolves old avatar paths and retains saved privacy', async () => {
  let body;
  await withFetch(async (input, init) => {
    if (String(input).startsWith('/api/user')) return response({ id: 'self', name: '新姓名', avatarUrl: '/asset/yzx/new.png', province: '上海', signature: '新简介', skills: ['React'] });
    assert.ok(String(input).includes('profile-sync')); body = JSON.parse(init.body);
    return response({ ok: true, isAdmin: false, profile: { userId: 'self', ...body, isPublic: false, allowCardExchange: false } });
  }, async () => {
    const user = toDoaiUser(await syncAtomclubProfile('self'));
    assert.equal(body.name, '新姓名'); assert.equal(body.avatar, 'https://v2.atomclub.cn/avatars/new.png');
    assert.equal(body.city, '上海'); assert.equal(body.bio, '新简介'); assert.deepEqual(body.skills, ['React']);
    assert.equal(body.expectedUserId, 'self'); assert.equal(body.isPublic, undefined);
    assert.equal(user.name, '新姓名'); assert.equal(user.isPublicInSquare, false); assert.equal(user.allowCardExchange, false);
  });
});

test('sync refuses a changed main account before sending any write', async () => {
  let writes = 0;
  await withFetch(async (_input, init) => { if (init.method !== 'GET') writes++; return response({ id: 'other' }); }, async () => {
    await assert.rejects(syncAtomclubProfile('self'), error => error instanceof ApiError && error.code === 'SESSION_CHANGED');
    assert.equal(writes, 0);
  });
});

test('sync requires confirmed saved profile and explicit server permission', async () => {
  for (const saved of [{ ok: true }, { ok: true, profile: { userId: 'other' }, isAdmin: true }, { ok: true, profile: { userId: 'self' }, isAdmin: 'true' }, { ok: true, profile: { userId: 'self' }, isAdmin: false }]) {
    await withFetch(async input => String(input).startsWith('/api/user') ? response({ id: 'self', name: 'Name', avatarUrl: '', city: '', signature: '', skills: [] }) : response(saved), async () => {
      await assert.rejects(syncAtomclubProfile('self'), /同步结果未确认/);
    });
  }
});

test('supplemental account mismatch or expiry cannot be treated as a valid current login', async () => {
  for (const [body, status, expected] of [[{ profile: { userId: 'other' }, isAdmin: true }, 200, 409], [{ message: 'expired' }, 401, 401]]) {
    await withFetch(async input => String(input).startsWith('/api/user') ? response({ id: 'self' }) : response(body, status), async () => {
      await assert.rejects(getAtomclubUser(), error => error instanceof ApiError && error.status === expected);
    });
  }
});

test('a stale or incomplete saved snapshot must not be reported as a completed profile sync', async () => {
  const account = { id: 'self', name: 'New name', avatarUrl: '', city: '上海', province: '', signature: 'New bio', skills: ['React'] };
  await withFetch(async input => String(input).startsWith('/api/user') ? response(account) : response({ ok: true, isAdmin: false, profile: { userId: 'self', name: 'Old name', isPublic: false, allowCardExchange: true } }), async () => {
    await assert.rejects(syncAtomclubProfile('self'), /同步结果未确认/);
  });
});

test('an incomplete or malformed main profile cannot clear saved fields by sending empty defaults', async () => {
  for (const account of [{ id: 'self' }, { id: 'self', name: {}, avatarUrl: '', city: '', signature: '', skills: [] }, { id: 'self', name: 'Name', avatarUrl: '', city: '', signature: '', skills: ['React', {}] }]) {
    let writes = 0;
    await withFetch(async (input, init) => { if (init.method !== 'GET') writes++; return response(account); }, async () => {
      await assert.rejects(syncAtomclubProfile('self'), /主站资料/);
      assert.equal(writes, 0);
    });
  }
});

test('malformed display values never escape into React text fields or skill lists', () => {
  const user = toDoaiUser({ id: 'self', name: 'Main name', phone: {}, city: {}, signature: {}, skills: ['React', {}, '', '  TypeScript  '], profile: { name: {}, city: {}, bio: [], skills: 'not-a-list', isPublic: 'yes', allowCardExchange: 'no' } });
  assert.equal(typeof user.phone, 'string'); assert.equal(typeof user.city, 'string'); assert.equal(typeof user.bio, 'string');
  assert.deepEqual(user.skills, ['React', 'TypeScript']); assert.equal(user.isPublicInSquare, false);
  assert.equal(typeof user.allowCardExchange, 'boolean'); assert.equal(user.privacyReady, false);
  assert.equal(toDoaiUser({ id: 'self', city: '', province: '上海' }).city, '上海');
  assert.equal(toDoaiUser({ id: 'self', city: 'Main city', profile: { city: '' } }).city, '');
});

test('sync accepts the main mapper without an avatar, removes blank skills and confirms intentional empty fields', async () => {
  let body;
  await withFetch(async (input, init) => {
    if (String(input).startsWith('/api/user')) return response({ id: 'self', name: ' Name ', city: '', province: '', signature: '', skills: [' React ', ' ', '', 'TypeScript'] });
    body = JSON.parse(init.body);
    return response({ ok: true, isAdmin: false, profile: { ...body, userId: 'self', isPublic: false, allowCardExchange: false } });
  }, async () => {
    const saved = await syncAtomclubProfile('self');
    assert.deepEqual(body.skills, ['React', 'TypeScript']); assert.equal(body.name, 'Name'); assert.equal(body.avatar, '');
    assert.equal(saved.profile.city, ''); assert.equal(saved.profile.bio, ''); assert.equal(saved.profile.allowCardExchange, false);
  });
});

test('a missing sync route uses the existing profile endpoint and preserves privacy without sending permission fields', async () => {
  for (const isPublic of [false, true]) {
    const calls = [];
    const account = { id: 'self', name: 'Fresh name', avatarUrl: '', city: '', signature: '', skills: [' React ', ' '] };
    const profile = { userId: 'self', name: 'Old name', isPublic, allowCardExchange: !isPublic };
    await withFetch(async (input, init) => {
      const url = String(input); calls.push([url, init.method]);
      if (url.startsWith('/api/user')) return response(account);
      if (url.includes('profile-sync')) return response({ error: { message: 'Cannot POST /api/doai/profile-sync' } }, 404);
      if (url.endsWith('__p=me')) return response({ ok: true, isAdmin: false, profile });
      assert.ok(url.endsWith('__p=profile'));
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body).sort(), ['avatar', 'bio', 'city', 'expectedUserId', 'name', 'skills']);
      assert.equal(body.expectedUserId, 'self');
      Object.assign(profile, { name: body.name, avatar: body.avatar, city: body.city, bio: body.bio, skills: body.skills });
      return response({ ok: true, profile });
    }, async () => {
      const saved = await syncAtomclubProfile('self');
      assert.equal(saved.profile.name, 'Fresh name'); assert.deepEqual(saved.profile.skills, ['React']);
      assert.equal(saved.profile.bio, ''); assert.equal(saved.profile.isPublic, isPublic);
      assert.equal(saved.profile.allowCardExchange, !isPublic); assert.equal(saved.isAdmin, false);
      assert.equal(calls.length, 4);
    });
  }
});

test('failed or ambiguous sync requests never trigger an alternate profile write', async () => {
  for (const [status, message] of [[400, 'Bad snapshot'], [401, 'Expired'], [409, 'Changed account'], [500, 'Lost response'], [404, '用户不存在']]) {
    let requests = 0;
    await withFetch(async input => {
      requests++;
      if (String(input).startsWith('/api/user')) return response({ id: 'self', name: 'Name', city: '', signature: '', skills: [] });
      assert.ok(String(input).includes('profile-sync'));
      return response({ error: { message } }, status);
    }, async () => {
      await assert.rejects(syncAtomclubProfile('self'), error => error instanceof ApiError && error.status === status);
      assert.equal(requests, 2);
    });
  }
});

test('legacy compatibility refuses unconfirmed ownership/privacy and unsupported skills before profile writes', async () => {
  for (const fixture of [
    { profile: { userId: 'other', isPublic: false, allowCardExchange: true } },
    { profile: { userId: 'self', isPublic: 'false', allowCardExchange: true } },
    { profile: { userId: 'self', isPublic: false, allowCardExchange: true }, isAdmin: 'true' },
    { skills: Array.from({ length: 21 }, (_, i) => `Skill ${i}`) },
    { skills: ['x'.repeat(65)] },
  ]) {
    let writes = 0;
    await withFetch(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/user')) return response({ id: 'self', name: 'Name', city: '', signature: '', skills: fixture.skills || [] });
      if (url.includes('profile-sync')) return response({ error: { message: 'Cannot POST /api/doai/profile-sync' } }, 404);
      if (init.method === 'POST') writes++;
      return response({ ok: true, isAdmin: false, ...fixture });
    }, async () => {
      await assert.rejects(syncAtomclubProfile('self'), /未确认|当前服务版本/);
      assert.equal(writes, 0);
    });
  }
});

test('legacy compatibility rejects stale snapshots and changed privacy in save receipts', async () => {
  for (const patch of [{ name: 'Old name' }, { userId: 'other' }, { isPublic: true }, { allowCardExchange: true }, { skills: ['Wrong skill'] }]) {
    const profile = { userId: 'self', name: 'Fresh name', avatar: '', city: '', bio: '', skills: [], isPublic: false, allowCardExchange: false };
    await withFetch(async input => {
      const url = String(input);
      if (url.startsWith('/api/user')) return response({ id: 'self', name: 'Fresh name', city: '', signature: '', skills: [] });
      if (url.includes('profile-sync')) return response({ error: { message: 'Cannot POST /api/doai/profile-sync' } }, 404);
      if (url.endsWith('__p=me')) return response({ ok: true, isAdmin: false, profile });
      return response({ ok: true, profile: { ...profile, ...patch } });
    }, async () => {
      await assert.rejects(syncAtomclubProfile('self'), /未确认/);
    });
  }
});
