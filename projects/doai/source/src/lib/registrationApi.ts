import { registrationChannelLabel } from './registrationChannel.ts';
import { apiRequest } from './api.ts';
import { readEntrySummary, registrationTrack } from './contestEntry.ts';
import { validApplicantEmail, validApplicantProfile } from './registrationContent.ts';
import type { Registration } from '../types';

export async function loadRegistrations(): Promise<Registration[]> {
  const result = await apiRequest<{ registrations: Registration[] }>('/api/registrations');
  if (!Array.isArray(result.registrations)) throw new Error('Invalid registration response');
  return result.registrations;
}

export function newestRegistrationFirst(a: Registration, b: Registration): number {
  return (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0);
}

export function registrationMaterials(registration: Registration) {
  return {
    videoUrl: registration.submission?.videoUrl || registration.videoUrl || '',
    demoUrl: registration.submission?.demoUrl || '',
    githubUrl: registration.submission?.githubUrl || '',
    docUrl: registration.submission?.docUrl ?? registration.docUrl ?? '',
  };
}

function csvCell(value: unknown): string {
  const original = String(value ?? '');
  // Spreadsheet applications must treat participant-provided text as text.
  const text = /^[=+@-]/.test(original.trimStart()) || /^[\t\r\n]/.test(original) ? `'${original}` : original;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Registration contact is private to the owner and authorised reviewers. */
export function confirmedAccountContact(registration: Registration): boolean {
  const saved = registration.accountContact;
  return !!saved && saved.source === 'account' && typeof registration.ownerUserId === 'string' && !!registration.ownerUserId
    && saved.userId === registration.ownerUserId && typeof saved.phone === 'string' && saved.phone.length <= 20 && !saved.phone.includes('*')
    && typeof saved.capturedAt === 'string' && Number.isFinite(Date.parse(saved.capturedAt));
}

export function registrationContact(registration: Registration) {
  const members = Array.isArray(registration.members) ? registration.members : [];
  const leader = members.find(member => member?.isLeader === true) || members[0];
  const name = typeof leader?.name === 'string' ? leader.name : '';
  const saved = registration.accountContact;
  if (confirmedAccountContact(registration)) {
    return { name, phone: saved!.phone, source: 'account' as const };
  }
  if (saved !== undefined) return { name, phone: '', source: 'unconfirmed' as const };
  return { name, phone: typeof leader?.phone === 'string' ? leader.phone : '', source: 'entry' as const };
}

export function registrationApplicant(registration: Registration): NonNullable<Registration['applicant']> | null {
  const saved = registration.applicant;
  if (!saved || !registration.ownerUserId || saved.userId !== registration.ownerUserId || typeof saved.name !== 'string' || !saved.name.trim() || saved.name.length > 64
    || typeof saved.city !== 'string' || !saved.city.trim() || saved.city.length > 64 || !Array.isArray(saved.skills) || saved.skills.length > 50
    || saved.skills.some(skill => typeof skill !== 'string' || !skill.trim() || skill.length > 100) || new Set(saved.skills).size !== saved.skills.length
    || ((saved.organization !== undefined || saved.position !== undefined || saved.age !== undefined) && !validApplicantProfile(saved))
    || (saved.email !== undefined && (typeof saved.email !== 'string' || !validApplicantEmail(saved.email)))
    || (saved.bio !== undefined && (typeof saved.bio !== 'string' || !saved.bio.trim() || saved.bio.length > 2000))) return null;
  return saved;
}

export const registrationContactSource = (registration: Registration): string => {
  const { source } = registrationContact(registration);
  return source === 'account' ? '账号绑定' : source === 'entry' ? '申报填写（历史记录）' : '未确认';
};

export function registrationCSV(registrations: Registration[]): string {
  const header = ['MakerID', '项目名称', '所属赛道', '具体申报方向', '战队名', '当前状态', '视频链接', '在线 Demo', 'GitHub 仓库', '文档链接', '申报人', '联系手机号', '联系方式来源', '申报城市', '申报技能', '申报邮箱', '个人简介', '公司／学校／机构组织名称', '职位／在读年级', '年龄', '海外国家／地区', '所属高校', '申报时间', '报名渠道'];
  const rows = registrations.map(registration => {
    const links = registrationMaterials(registration);
    const contact = registrationContact(registration);
    const applicant = registrationApplicant(registration);
    return [registration.makerId, registration.projectName, registrationTrack(registration), readEntrySummary(registration.projectSummary).entry,
      registration.teamName, registration.status, links.videoUrl, links.demoUrl, links.githubUrl, links.docUrl, contact.name, contact.phone,
      registrationContactSource(registration), applicant?.city || '', applicant?.skills.join('、') || '', applicant?.email || '', applicant?.bio || '', applicant?.organization || '', applicant?.position || '', applicant?.age ?? '', readEntrySummary(registration.projectSummary).overseas?.countryOrRegion || '', readEntrySummary(registration.projectSummary).overseas?.university || '', registration.submittedAt, registrationChannelLabel(registration.channel)];
  });
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
