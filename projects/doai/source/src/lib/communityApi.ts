import { apiRequest, apiFetch, apiUrl } from './api.ts';
import type { RecruitmentPost, TalentProfile } from '../types';
import { cardProfile } from './cardProfile.ts';

export function validRecruitment(row: RecruitmentPost): boolean {
  return Boolean(row && typeof row.id === 'string' && typeof row.title === 'string' && typeof row.summary === 'string'
    && typeof row.city === 'string' && row.leader && typeof row.leader.id === 'string' && typeof row.leader.name === 'string'
    && Array.isArray(row.neededRoles) && Array.isArray(row.skills)
    && ['idea', 'prototype', 'demo'].includes(row.stage) && ['open', 'filled'].includes(row.status)
    && row.neededRoles.every(value => typeof value === 'string') && row.skills.every(value => typeof value === 'string')
    && Number.isInteger(row.likes) && Number.isInteger(row.applicationsCount));
}

export async function loadRecruitments(): Promise<RecruitmentPost[]> {
  const data = await apiRequest<{ recruitments: RecruitmentPost[] }>('/api/recruitments');
  if (!Array.isArray(data.recruitments) || !data.recruitments.every(validRecruitment)) throw new Error('Invalid recruitment response');
  return data.recruitments;
}

export function newestRecruitmentFirst(a: RecruitmentPost, b: RecruitmentPost): number {
  return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
}

export async function loadRecruitmentDetail(id: string): Promise<RecruitmentPost[]> {
  const response = await apiFetch(apiUrl(`/api/recruitments/${encodeURIComponent(id)}`));
  if (response.status === 404) return [];
  const data = await response.json();
  if (!response.ok || !validRecruitment(data?.recruitment) || data.recruitment.id !== id) throw new Error('Recruitment detail unavailable');
  return [data.recruitment];
}

export async function loadTalents(): Promise<TalentProfile[]> {
  const data = await apiRequest<{ talents: TalentProfile[] }>('/api/talents');
  if (!Array.isArray(data.talents)) throw new Error('Invalid talent response');
  if (data.talents.some(row => !row || typeof row.isPublic !== 'boolean')) throw new Error('Talent privacy state is unconfirmed');
  return data.talents.filter(row => row.isPublic).map(row => {
    if (typeof row.id !== 'string' || !row.id || row.id.length > 36 || row.id !== row.id.trim() || !Number.isInteger(row.likes) || row.likes < 0) throw new Error('Invalid talent record');
    return { ...cardProfile(row), id: row.id, likes: row.likes, hasLiked: row.hasLiked === true, isPublic: true,
      atomclubVerified: row.atomclubVerified === true,
      availableTime: typeof row.availableTime === 'string' ? row.availableTime.slice(0, 64) : '',
      roleIntent: typeof row.roleIntent === 'string' ? row.roleIntent.slice(0, 128) : '',
    };
  });
}

export function applicationMessage(form: { name: string; skills: string; message: string }, english = false): string {
  const values = [form.name.trim(), form.skills.trim(), form.message.trim()];
  if (values[0].length > 64 || values[1].length > 200 || !values[2] || values[2].length > 500) throw new Error(english ? 'Check your name, skills and introduction lengths.' : '请检查称呼、技能和介绍长度');
  return [values[0] && `${english ? 'Name' : '称呼'}: ${values[0]}`, values[1] && `${english ? 'Skills' : '相关技能'}: ${values[1]}`, values[2]].filter(Boolean).join('\n');
}

export function recruitmentTags(value: string, english = false): string[] {
  const tags = value.split(/[、,，;；\n]/).map(tag => tag.trim()).filter(Boolean);
  if (tags.length > 20 || tags.some(tag => tag.length > 64)) throw new Error(english ? 'Use up to 20 tags, with 64 characters per tag.' : '标签最多 20 项，每项不超过 64 字符');
  return [...new Set(tags)];
}

export interface RecruitmentApplication {
  id: string;
  applicant: { id: string; name: string; avatar: string; city: string };
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'handled';
  createdAt: string;
}
