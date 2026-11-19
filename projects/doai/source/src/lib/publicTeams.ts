import { apiRequest, ApiError } from './api.ts';
import type { TrackType } from '../types';

export interface PublicTeam {
  id: string;
  name: string;
  track: TrackType;
  leaderId: string;
  description: string;
  members: { id: string; name: string; isLeader: boolean; roleTitle: string }[];
}

/** Only the public team snapshot is retained; entry details and invite codes are excluded. */
export function readPublicTeams(values: unknown): PublicTeam[] {
  if (!Array.isArray(values)) throw new Error('战队列表暂不可用');
  const valid = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
  const rows = values.map((value): PublicTeam => {
    const row = value as PublicTeam & { desc?: string };
    if (!row || !valid(row.id, 36) || !valid(row.name, 64) || !valid(row.leaderId, 36)
      || !['industry', 'creator'].includes(row.track) || !Array.isArray(row.members)
      || row.members.length < 1 || row.members.length > 5
      || new Set(row.members.map(m => m?.id)).size !== row.members.length
      || row.members.some(m => !m || !valid(m.id, 36) || !valid(m.name, 64) || typeof m.isLeader !== 'boolean')
      || row.members.filter(m => m.isLeader).length !== 1
      || !row.members.some(m => m.isLeader && m.id === row.leaderId)) throw new Error('战队列表暂不可用');
    return {
      id: row.id, name: row.name, track: row.track, leaderId: row.leaderId,
      description: typeof row.desc === 'string' ? row.desc.slice(0, 1000) : typeof row.description === 'string' ? row.description.slice(0, 1000) : '',
      members: row.members.map(m => ({ id: m.id, name: m.name, isLeader: m.isLeader, roleTitle: typeof m.roleTitle === 'string' ? m.roleTitle : '' })),
    };
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('战队列表暂不可用');
  return rows;
}

export async function loadPublicTeams(): Promise<PublicTeam[]> {
  const result = await apiRequest<{ ok: boolean; teams: unknown[] }>('/api/teams');
  if (result?.ok !== true) throw new Error('战队列表暂不可用');
  return readPublicTeams(result.teams);
}

export type TeamPage = { teams: PublicTeam[]; total: number; page: number; pageSize: number; legacy: boolean };
export async function loadPublicTeamPage(page: number, search: string, track: string): Promise<TeamPage> {
  const pageSize = 6;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search: search.trim(), track });
  const result = await apiRequest<{ ok: boolean; teams: unknown[]; total?: number; page?: number; pageSize?: number }>(`/api/teams?${params}`);
  if (result?.ok !== true) throw new Error('战队列表暂不可用');
  const teams = readPublicTeams(result.teams);
  if (result.total === undefined && result.page === undefined && result.pageSize === undefined) {
    // Support a rolling deployment; expose that this is the old bounded directory.
    const q = search.trim().toLowerCase();
    const filtered = teams.filter(t => (track === 'all' || t.track === track) && (!q || [t.name, t.description, ...t.members.map(m => m.name)].some(v => v.toLowerCase().includes(q))));
    const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
    return { teams: filtered.slice((current - 1) * pageSize, current * pageSize), total: filtered.length, page: current, pageSize, legacy: true };
  }
  if (!Number.isSafeInteger(result.total) || result.total! < 0 || !Number.isSafeInteger(result.page) || result.page! < 1
    || result.pageSize !== pageSize || result.page! > Math.max(1, Math.ceil(result.total! / pageSize)) || teams.length !== Math.min(pageSize, Math.max(0, result.total! - (result.page! - 1) * pageSize))) throw new Error('战队分页结果未确认，请重试');
  return { teams, total: result.total!, page: result.page!, pageSize, legacy: false };
}

export async function loadPublicTeam(id: string): Promise<PublicTeam | null> {
  try {
    const result = await apiRequest<{ ok: boolean; team: unknown }>(`/api/teams/${encodeURIComponent(id)}`);
    if (result?.ok !== true) throw new Error('战队详情暂不可用');
    const [team] = readPublicTeams([result.team]);
    if (team.id !== id) throw new Error('战队详情未确认');
    return team;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      if (e.message.startsWith('Cannot GET ')) throw new Error('战队详情服务需要更新，请稍后重试');
      return null;
    }
    throw e;
  }
}
