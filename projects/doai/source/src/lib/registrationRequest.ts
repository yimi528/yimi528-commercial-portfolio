import { validRegistrationChannel } from './registrationChannel.ts';
import { apiRequest, ApiError } from './api.ts';
import { registrationContentKey, validApplicantEmail, validApplicantProfile } from './registrationContent.ts';
import { confirmedAccountContact, registrationApplicant } from './registrationApi.ts';
import { isTrackRegistrationOpen, registrationAvailability } from './contestRegistration.ts';
import type { Registration, DigitalTicket } from '../types';

export type RegistrationDraft = Omit<Registration, 'id' | 'makerId' | 'status' | 'submittedAt' | 'inviteCode' | 'accountContact' | 'applicant'> & { applicant?: { name: string; city: string; skills: string[]; organization?: string; position?: string; age?: number; email?: string; bio?: string } };
export type RegistrationReceipt = { registration: Registration; ticket: DigitalTicket; created: boolean };
const pending = new Map<string, string | null>();
const storageKey = (uid: string) => `doai:registration-request:2026:${uid}`;
const validKey = (key: unknown): key is string => typeof key === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(key);

export function pendingRegistrationKey(uid: string): string {
  const remembered = pending.get(uid);
  if (remembered) return remembered;
  let saved: string | null = null;
  if (!pending.has(uid)) {
    try { saved = globalThis.sessionStorage?.getItem(storageKey(uid)); } catch { /* Memory fallback. */ }
  }
  const key = validKey(saved) ? saved : (globalThis.crypto?.randomUUID?.()
    || `request-${Date.now().toString(36)}-${Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')}`);
  pending.set(uid, key);
  try { globalThis.sessionStorage?.setItem(storageKey(uid), key); } catch { /* No draft or contact data is stored. */ }
  return key;
}

export function clearRegistrationRequest(uid: string, key: string): void {
  if (pending.get(uid) !== key) return;
  pending.set(uid, null);
  try {
    if (globalThis.sessionStorage?.getItem(storageKey(uid)) === key) globalThis.sessionStorage.removeItem(storageKey(uid));
  } catch { /* Content deduplication on the server also covers storage restrictions. */ }
}

export class RegistrationConflict extends Error {
  registration: Registration;
  requestKey: string;
  constructor(registration: Registration, key: string) {
    super('上次提交已经保存，但与当前草稿不同。请先核对已有报名，或选择另报项目。');
    this.registration = registration;
    this.requestKey = key;
  }
}

function readReceipt(value: any, uid: string, key: string): RegistrationReceipt {
  const row = value?.registration, ticket = value?.ticket;
  const nonempty = (value: unknown) => typeof value === 'string' && !!value.trim();
  if (value?.ok !== true || value.userId !== uid || value.requestKey !== key || value.found !== true || typeof value.created !== 'boolean'
    || !row || !nonempty(row.id) || !nonempty(row.makerId) || row.ownerUserId !== uid
    || !['submitted', 'reviewing', 'needs_info', 'shortlisted', 'rejected'].includes(row.status)
    || !nonempty(row.submittedAt) || !Number.isFinite(Date.parse(row.submittedAt))
    || !['individual', 'team'].includes(row.type) || !['creator', 'industry'].includes(row.track)
    || (row.teamBinding !== undefined && (row.type !== 'team' || !nonempty(row.teamId) || row.teamId.length > 36
      || !['create', 'existing'].includes(row.teamBinding?.kind) || (row.teamBinding.kind === 'existing' && row.teamBinding.id !== row.teamId)))
    || !nonempty(row.projectName) || !nonempty(row.teamName) || !nonempty(row.projectSummary)
    || (value.created === true && !confirmedAccountContact(row))
    || (row.accountContact !== undefined && !confirmedAccountContact(row))
    || (row.applicant !== undefined && !registrationApplicant(row))
    || typeof row.videoUrl !== 'string' || typeof row.docUrl !== 'string'
    || !Array.isArray(row.members) || row.members.length < 1 || row.members.length > 5
    || row.members.filter((member: any) => member?.isLeader === true).length !== 1
    || row.members.some((member: any) => !member || typeof member.id !== 'string' || !nonempty(member.name)
      || typeof member.phone !== 'string' || typeof member.roleTitle !== 'string' || typeof member.isLeader !== 'boolean'
      || (member.isLeader && member.id !== uid))
    || !ticket || !nonempty(ticket.id) || ticket.ownerUserId !== uid || ticket.type !== 'maker'
    || ticket.bookingKey !== `registration:${row.id}` || !['claimed', 'checked_in'].includes(ticket.status) || !nonempty(ticket.qrCode)) {
    throw new Error('报名回执未确认，请保留草稿后重试，或到「我的报名」核对');
  }
  return { registration: row, ticket, created: value.created };
}

export async function saveRegistration(draft: RegistrationDraft, uid: string, isCurrent: () => boolean): Promise<RegistrationReceipt> {
  if (draft.channel !== undefined && !validRegistrationChannel(draft.channel)) throw new Error('请选择报名渠道');
  if (!isTrackRegistrationOpen(draft.track)) throw new Error(registrationAvailability.zh);
  const profileApplicant = draft.applicant && (draft.applicant.organization !== undefined || draft.applicant.position !== undefined || draft.applicant.age !== undefined);
  if (profileApplicant && !validApplicantProfile(draft.applicant!)) throw new Error('请填写公司／学校／机构组织名称、职位／在读年级及真实年龄（1–150 的整数）');
  const extendedApplicant = draft.applicant?.email !== undefined || draft.applicant?.bio !== undefined;
  if (extendedApplicant && (!validApplicantEmail(draft.applicant?.email?.trim() || '') || !draft.applicant?.bio?.trim() || draft.applicant.bio.trim().length > 2000)) throw new Error('请填写有效邮箱和个人简介（最多 2000 字）');
  const key = pendingRegistrationKey(uid);
  const assertCurrent = () => { if (!isCurrent()) throw new Error('账号已切换，请重新操作'); };
  assertCurrent();
  const prior = await apiRequest<any>(`/api/registration-requests/${encodeURIComponent(key)}`).catch(error => {
    if (error instanceof ApiError && error.status === 404) throw new Error('报名服务暂不可用，请稍后重试，或到「我的报名」核对');
    throw error;
  });
  assertCurrent();
  // Do not send to a backend that has not installed the retry protocol yet.
  if (prior?.ok !== true || prior.userId !== uid || prior.requestKey !== key || typeof prior.found !== 'boolean') {
    throw new Error('报名提交服务尚未确认，请稍后重试');
  }
  if (!prior.found && draft.channel !== undefined && prior.channelPolicy !== 'scoped-v1') throw new Error('报名渠道服务尚未就绪，请保留草稿后稍后重试');
  if (!prior.found && prior.contactPolicy !== 'account') throw new Error('报名联系方式暂不可确认，请稍后重试，或到「我的报名」核对');
  if (!prior.found && draft.applicant !== undefined && (extendedApplicant ? prior.applicantPolicy !== 'snapshot-v2' : !['snapshot-v1', 'snapshot-v2'].includes(prior.applicantPolicy))) throw new Error('报名资料保存服务暂不可确认，请保留草稿后稍后重试');
  if (!prior.found && profileApplicant && prior.applicantFieldsPolicy !== 'organization-position-age-v1') throw new Error('新增报名资料保存服务尚未就绪，请保留草稿后稍后重试');
  if (!prior.found && draft.teamBinding !== undefined && prior.teamPolicy !== 'linked-v1') throw new Error('战队报名服务尚未就绪，请保留草稿后稍后重试');
  const result = prior.found ? prior : await apiRequest<any>('/api/registrations', { ...draft, requestKey: key, expectedUserId: uid });
  assertCurrent();
  const receipt = readReceipt(result, uid, key);
  if (receipt.created && draft.applicant !== undefined && !registrationApplicant(receipt.registration)) throw new Error('报名资料保存未确认，请保留草稿后重试或查看已有报名');
  const comparable = draft.teamBinding?.kind === 'existing' && receipt.registration.teamBinding?.kind === 'create'
    && draft.teamBinding.id === receipt.registration.teamId ? { ...draft, teamBinding: receipt.registration.teamBinding } : draft;
  if (registrationContentKey(receipt.registration, uid) !== registrationContentKey(comparable, uid)) {
    throw new RegistrationConflict(receipt.registration, key);
  }
  clearRegistrationRequest(uid, key);
  return receipt;
}
