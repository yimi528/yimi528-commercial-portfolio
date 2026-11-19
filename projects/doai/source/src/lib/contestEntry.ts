import { contestBriefs } from '../data/community.ts';
import type { TrackType } from '../types';

export const entryOptions = [
  ...contestBriefs.filter(brief => brief.track === 'industry').map(brief => ({
    id: brief.id, track: brief.track, code: brief.code,
    label: `${brief.sponsor} · ${brief.title}`,
    labelEn: `${brief.sponsorEn} · ${brief.titleEn}`,
  })),
  { id: 'ai-infra', track: 'creator', code: 'AI Infra', label: 'AI Infra 赛道', labelEn: 'AI Infrastructure' },
  { id: 'ai-app', track: 'creator', code: 'AI App', label: 'AI 应用赛道', labelEn: 'AI Applications' },
  { id: 'ai-hardware', track: 'creator', code: 'AI Hardware', label: 'AI 智能硬件赛道', labelEn: 'AI Smart Hardware' },
] satisfies { id: string; track: TrackType; code: string; label: string; labelEn: string }[];

// 主站当前只持久化赛道大类与摘要。把具体命题作为可读的摘要首行保存，
// 确保刷新、跨设备、审核和导出都能恢复，不依赖未发布的数据库字段。
export interface OverseasAffiliation {
  countryOrRegion: string;
  university: string;
}

export function validOverseasAffiliation(value: unknown): value is OverseasAffiliation {
  const row = value as OverseasAffiliation | null;
  return !!row && typeof row.countryOrRegion === 'string' && !!row.countryOrRegion.trim() && row.countryOrRegion.length <= 100
    && typeof row.university === 'string' && !!row.university.trim() && row.university.length <= 200
    && !/[\r\n]/.test(row.countryOrRegion + row.university);
}

export function encodeEntrySummary(optionId: string, summary: string, overseas?: OverseasAffiliation): string {
  const option = entryOptions.find(item => item.id === optionId);
  if (!option) throw new Error('请选择具体命题或技术方向');
  if (overseas !== undefined && (!validOverseasAffiliation(overseas) || option.track !== 'creator')) throw new Error('请填写有效的海外国家／地区和高校');
  const affiliation = overseas ? `【海外报名：${JSON.stringify({ countryOrRegion: overseas.countryOrRegion.trim(), university: overseas.university.trim() })}】\n` : '';
  return `【申报方向：${option.code} · ${option.label}】\n${affiliation}${summary.trim()}`;
}

export function readEntrySummary(summary: string) {
  const match = /^【申报方向：([^\n]+)】\n/.exec(summary);
  let body = match ? summary.slice(match[0].length) : summary;
  let overseas: OverseasAffiliation | undefined;
  const affiliation = match && /^【海外报名：([^\n]+)】\n/.exec(body);
  if (affiliation) {
    try {
      const parsed: unknown = JSON.parse(affiliation[1]);
      if (validOverseasAffiliation(parsed)) { overseas = parsed; body = body.slice(affiliation[0].length); }
    } catch { /* Preserve unrecognised historical text. */ }
  }
  return { entry: match?.[1] || '', summary: body, overseas };
}

export function registrationTrack(registration: { track: string; projectSummary: string }): 'industry' | 'creator' | 'overseas' {
  return registration.track === 'industry' ? 'industry' : readEntrySummary(registration.projectSummary).overseas ? 'overseas' : 'creator';
}

export function registrationTrackLabel(registration: { track: string; projectSummary: string }, en = false): string {
  const track = registrationTrack(registration);
  return track === 'industry' ? (en ? 'FDE Track' : 'FDE 赛道') : track === 'overseas' ? (en ? 'Overseas Special Track' : '海外专场赛道') : (en ? 'Free Creation Track' : '自由创意赛道');
}
