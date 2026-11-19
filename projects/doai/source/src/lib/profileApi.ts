import { apiRequest } from './api.ts';

export type PrivacySettings = { isPublicInSquare: boolean; allowCardExchange: boolean };
export async function savePrivacySettings(userId: string, patch: Partial<PrivacySettings>): Promise<PrivacySettings> {
  const result = await apiRequest<{ ok: boolean; profile?: { userId?: string; isPublic?: boolean; allowCardExchange?: boolean } }>('/api/profile', { ...patch, expectedUserId: userId });
  const saved = result.profile;
  if (result.ok !== true || saved?.userId !== userId || typeof saved.isPublic !== 'boolean' || typeof saved.allowCardExchange !== 'boolean'
    || (patch.isPublicInSquare !== undefined && saved.isPublic !== patch.isPublicInSquare)
    || (patch.allowCardExchange !== undefined && saved.allowCardExchange !== patch.allowCardExchange)) throw new Error('隐私设置保存结果未确认，请重新读取账号后重试');
  return { isPublicInSquare: saved.isPublic, allowCardExchange: saved.allowCardExchange };
}
