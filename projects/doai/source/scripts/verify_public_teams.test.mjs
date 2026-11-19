import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublicTeams } from '../src/lib/publicTeams.ts';

const team = { id: 'team', name: '原子战队', track: 'creator', leaderId: 'captain', desc: '一起创造', inviteCode: 'private-code', projectSummary: 'private-entry', members: [{ id: 'captain', name: '队长', isLeader: true, roleTitle: '开发' }] };
test('public teams retain only the community snapshot and reject invalid rosters', async () => {
  const original = globalThis.fetch;
  let payload = { ok: true, teams: [team] };
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  try {
    const [saved] = await loadPublicTeams();
    assert.equal(saved.description, '一起创造');
    assert.equal(saved.members[0].name, '队长');
    assert.equal('inviteCode' in saved, false);
    assert.equal('projectSummary' in saved, false);
    for (const bad of [null, { ...team, members: [] }, { ...team, leaderId: 'missing' }, { ...team, members: [...team.members, ...team.members] }]) {
      payload = { ok: true, teams: [bad] };
      await assert.rejects(loadPublicTeams(), /战队列表暂不可用/);
    }
    payload = { ok: true, teams: [team, team] };
    await assert.rejects(loadPublicTeams(), /战队列表暂不可用/);
    payload = { ok: true, teams: [] };
    assert.deepEqual(await loadPublicTeams(), []);
  } finally { globalThis.fetch = original; }
});

test('server pagination and direct detail do not depend on the first 500 teams', async () => {
  const { loadPublicTeamPage, loadPublicTeam } = await import('../src/lib/publicTeams.ts');
  const original = globalThis.fetch;
  const rows = Array.from({ length: 6 }, (_, i) => ({ ...team, id: `older-${i}` }));
  let payload = { ok: true, total: 1001, page: 84, pageSize: 6, teams: rows };
  globalThis.fetch = async input => { assert.ok(String(input).includes('page=84')); return new Response(JSON.stringify(payload)); };
  try {
    const page = await loadPublicTeamPage(84, '', 'all');
    assert.equal(page.total, 1001); assert.equal(page.page, 84); assert.equal(page.teams.length, 6); assert.equal(page.legacy, false);
    payload = { ...payload, total: 500 };
    await assert.rejects(loadPublicTeamPage(84, '', 'all'), /分页结果/);
    globalThis.fetch = async input => { assert.ok(String(input).includes('teams%2Folder-0') || String(input).includes('teams/older-0')); return new Response(JSON.stringify({ ok: true, team: rows[0] })); };
    assert.equal((await loadPublicTeam('older-0')).id, 'older-0');
  } finally { globalThis.fetch = original; }
});
