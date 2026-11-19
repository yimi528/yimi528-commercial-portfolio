import { apiRequest } from './api.ts';
import type { TrackType } from '../types';

export interface RegistrationTeam {
  id: string;
  name: string;
  track: TrackType;
  leaderId: string;
  members: { id: string; name: string; roleTitle: string; isLeader: boolean }[];
}
export async function loadRegistrationTeam(owner: string): Promise<RegistrationTeam | null> {
  const result = await apiRequest<{ ok: boolean; userId?: string; team: RegistrationTeam | null }>('/api/my-team');
  const valid = (v: unknown, max: number) => typeof v === 'string' && !!v.trim() && v.length <= max;
  if (result?.ok !== true || (result.userId !== undefined && result.userId !== owner) || !('team' in result)) throw new Error('战队资料未确认，请重新加载');
  if (result.team === null) return null;
  const team = result.team;
  if (!team || !valid(team.id, 36) || !valid(team.name, 64) || !valid(team.leaderId, 36) || !['creator', 'industry'].includes(team.track)
    || !Array.isArray(team.members) || !team.members.length || team.members.length > 5
    || new Set(team.members.map(m => m?.id)).size !== team.members.length
    || team.members.some(m => !m || !valid(m.id, 36) || !valid(m.name, 64) || typeof m.roleTitle !== 'string' || typeof m.isLeader !== 'boolean')
    || !team.members.some(m => m.id === owner) || team.members.filter(m => m.isLeader).length !== 1
    || !team.members.some(m => m.isLeader && m.id === team.leaderId)) throw new Error('战队资料未确认，请重新加载');
  return team;
}
