import { apiRequest } from './api.ts';

export interface CheckinRecord { code: string; gate: string; holder: string; time: string; }
export function validCheckinRecord(value: unknown): value is CheckinRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.code === 'string' && Boolean(row.code.trim()) && typeof row.gate === 'string' && Boolean(row.gate.trim())
    && typeof row.holder === 'string' && typeof row.time === 'string' && Number.isFinite(Date.parse(row.time));
}
export async function checkinCode(code: string, gate: string): Promise<CheckinRecord> {
  const result = await apiRequest<{ ok: boolean; record: CheckinRecord }>('/api/checkin', { code, gate });
  if (result.ok !== true || !validCheckinRecord(result.record) || result.record.code !== code) throw new Error('核销结果未确认，请刷新记录后重试');
  return result.record;
}
export async function loadCheckins(): Promise<CheckinRecord[]> {
  const result = await apiRequest<{ ok: boolean; checkins: CheckinRecord[] }>('/api/checkins');
  if (result.ok !== true || !Array.isArray(result.checkins) || !result.checkins.every(validCheckinRecord)) throw new Error('核销记录未读取成功');
  return result.checkins;
}
